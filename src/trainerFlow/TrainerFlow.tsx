'use client';

import { useEffect, useMemo, useState } from 'react';

import { ArrowLeft, Clock, Hash, XCircle } from 'lucide-react';
import type { NewlyUnlockedAchievementDto } from '@smmtry/shared';

import type { PresetDefinition, PresetId, SessionConfigBase, SessionMetrics, SessionResult, TrainerDefinition } from './types';
import { PresetSelect } from './components/PresetSelect';
import { TrainerResultScreen } from './components/TrainerResultScreen';
import { PostSessionAchievements } from './components/PostSessionAchievements';
import { safeUuid } from './utils';
import { recordBestResult } from '../lib/bestResults';
import { Button } from '../components/ui/button';
import { TrainerGameFrame } from '../components/TrainerGameFrame';
import { CenteredOverlay } from '../components/CenteredOverlay';
import { cn } from '../lib/utils';

type Step = 'entry' | 'select' | 'session' | 'achievements' | 'result';

function ensurePresetConfig<TConfig extends SessionConfigBase>(preset: PresetDefinition<TConfig, any>): TConfig {
  const base = preset.defaultConfig;
  if (base.presetId === preset.id) return base;
  return { ...base, presetId: preset.id };
}

export function TrainerFlow<TProgress, TConfig extends SessionConfigBase>(props: {
  definition: TrainerDefinition<TProgress, TConfig>;
}) {
  const { definition } = props;
  const definitionKey = definition.meta.id;

  const presets = definition.presets;
  const [step, setStep] = useState<Step>('entry');
  const [progress, setProgress] = useState<TProgress | null>(null);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entryReloadKey, setEntryReloadKey] = useState(0);

  const [selectedPresetId, setSelectedPresetId] = useState<PresetId | null>(presets[0]?.id ?? null);
  const [config, setConfig] = useState<TConfig | null>(presets[0] ? ensurePresetConfig(presets[0]) : null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [result, setResult] = useState<SessionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [sessionRunKey, setSessionRunKey] = useState(0);
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics>({});
  const [unlockedPresetTitle, setUnlockedPresetTitle] = useState<string | null>(null);
  const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState<NewlyUnlockedAchievementDto[]>([]);

  const selectedPreset = useMemo(() => {
    if (!selectedPresetId) return null;
    return presets.find((p) => p.id === selectedPresetId) ?? null;
  }, [presets, selectedPresetId]);

  const linearOrder = useMemo(() => {
    if (definition.unlockPolicy?.type !== 'linear') return null;
    const order = definition.unlockPolicy.order?.length ? definition.unlockPolicy.order : presets.map((p) => p.id);
    return order;
  }, [definition.unlockPolicy, presets]);

  const resolveLocked = (presetId: PresetId): { locked: boolean; reason?: string | null } => {
    const p = progress;
    const preset = presets.find((x) => x.id === presetId);
    if (!preset) return { locked: true, reason: 'Неизвестный уровень' };
    if (!p) return { locked: false };

    // Prefer explicit unlockPolicy.custom when present.
    if (definition.unlockPolicy?.type === 'custom') {
      const locked = definition.unlockPolicy.isLocked({ presetId, progress: p });
      const reason = definition.unlockPolicy.lockedReason?.({ presetId, progress: p }) ?? null;
      return { locked, reason };
    }

    // UnlockPolicy.linear: gate by completion of prerequisites in declared order.
    if (definition.unlockPolicy?.type === 'linear') {
      const order = linearOrder ?? presets.map((x) => x.id);
      const idx = order.indexOf(presetId);
      if (idx > 0) {
        for (let j = 0; j < idx; j++) {
          const reqId = order[j]!;
          const ok = definition.unlockPolicy.isCompleted({ presetId: reqId, progress: p });
          if (!ok) {
            const customReason = definition.unlockPolicy.lockedReason?.({ presetId, missingPresetId: reqId, progress: p }) ?? null;
            if (customReason) return { locked: true, reason: customReason };
            const reqPreset = presets.find((x) => x.id === reqId);
            return { locked: true, reason: reqPreset ? `Сначала пройди “${reqPreset.title}”` : 'Сначала пройди предыдущий уровень' };
          }
        }
      }
    }

    // Per-preset lock hooks (additional constraints).
    const locked = preset.unlock?.isLocked?.({ progress: p }) ?? false;
    const reason = preset.unlock?.lockedReason?.({ progress: p }) ?? null;
    return { locked, reason };
  };

  const resolveLockedForProgress = (presetId: PresetId, p: any): { locked: boolean } => {
    const preset = presets.find((x) => x.id === presetId);
    if (!preset) return { locked: true };
    if (!p) return { locked: false };

    if (definition.unlockPolicy?.type === 'custom') {
      return { locked: !!definition.unlockPolicy.isLocked({ presetId, progress: p }) };
    }

    if (definition.unlockPolicy?.type === 'linear') {
      const order = linearOrder ?? presets.map((x) => x.id);
      const idx = order.indexOf(presetId);
      if (idx > 0) {
        for (let j = 0; j < idx; j++) {
          const reqId = order[j]!;
          const ok = definition.unlockPolicy.isCompleted({ presetId: reqId, progress: p });
          if (!ok) return { locked: true };
        }
      }
    }

    // Per-preset lock hooks (additional constraints).
    return { locked: preset.unlock?.isLocked?.({ progress: p }) ?? false };
  };

  const resolveCompleted = (presetId: PresetId): boolean => {
    const p: any = progress;
    if (!p) return false;

    // Prefer UnlockPolicy.linear.isCompleted when available.
    if (definition.unlockPolicy?.type === 'linear') {
      try {
        return !!definition.unlockPolicy.isCompleted({ presetId, progress: p });
      } catch {
        // ignore, fallback to heuristic
      }
    }

    // Heuristic completion for common progress shapes.
    if (presetId === 'accuracy-choice') return !!p['accuracy-choice'];
    if (presetId === 'accuracy-input') return !!p['accuracy-input'];
    if (presetId === 'accuracy') return !!p.accuracy;
    if (presetId === 'speed') return !!p.speed;
    if (presetId === 'lvl1') return !!p.lvl1;
    if (presetId === 'lvl2') return !!p.lvl2;
    if (presetId === 'lvl3') return !!p.lvl3;
    if (String(presetId).startsWith('race:')) {
      const n = Number(String(presetId).split(':')[1] || 0);
      return Number(p.raceStars || 0) >= n;
    }
    return false;
  };

  const canShowAdvanced = useMemo(() => {
    if (!definition.advanced || !selectedPreset || !progress) return false;
    const gate = definition.advanced.isAvailable;
    if (!gate) return true;
    return !!gate({ presetId: selectedPreset.id, progress });
  }, [definition.advanced, selectedPreset, progress]);

  const nextPresetId = useMemo(() => {
    if (!selectedPreset) return null;
    const order = linearOrder ?? presets.map((p) => p.id);
    const idx = order.indexOf(selectedPreset.id);
    if (idx < 0) return null;
    for (let i = idx + 1; i < order.length; i++) {
      const id = order[i];
      if (!id) continue;
      if (!resolveLocked(id).locked) return id;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPreset?.id, linearOrder, presets, progress]); // eslint-disable-line react-hooks/exhaustive-deps

  const startSession = (nextConfig: TConfig) => {
    setResult(null);
    setEntryError(null);
    setSessionMetrics({});
    setUnlockedPresetTitle(null);
    setNewlyUnlockedAchievements([]);
    setConfig(nextConfig);
    setSessionRunKey((k) => k + 1);
    setStep('session');
  };

  const handleStart = () => {
    if (!selectedPreset || !config) return;
    const lock = resolveLocked(selectedPreset.id);
    if (lock.locked) return;

    // New attempt id per run. Retry = new attempt.
    const next = { ...config, presetId: selectedPreset.id, attemptId: safeUuid() };
    startSession(next);
  };

  const handleBackToSelect = () => {
    setBusy(false);
    setResult(null);
    setUnlockedPresetTitle(null);
    setNewlyUnlockedAchievements([]);
    setStep('select');
  };

  const handleFinish = async (r: SessionResult) => {
    if (!config || !progress) {
      setResult(r);
      setStep('result');
      return;
    }

    // Common best-result mechanism (local, best-effort).
    try {
      const presetId = String(config.presetId || '');
      recordBestResult({
        trainerId: definition.meta.id,
        presetId,
        result: {
          total: Math.max(0, Math.floor(Number(r.metrics.total || 0))),
          solved: Number.isFinite(Number(r.metrics.solved)) ? Math.floor(Number(r.metrics.solved)) : undefined,
          correct: Number.isFinite(Number(r.metrics.correct)) ? Math.floor(Number(r.metrics.correct)) : undefined,
          mistakes: Number.isFinite(Number(r.metrics.mistakes)) ? Math.floor(Number(r.metrics.mistakes)) : undefined,
          timeSec: Number.isFinite(Number(r.metrics.timeSec)) ? Math.floor(Number(r.metrics.timeSec)) : undefined,
          won: typeof r.metrics.won === 'boolean' ? r.metrics.won : undefined,
          starsEarned: (r.metrics.starsEarned as any) ?? undefined,
        },
      });
    } catch {
      // ignore
    }

    setBusy(true);
    try {
      const prevProgress = progress as any;
      const outcome = await definition.recordResult({ config, result: r, prevProgress: progress });
      const nextProgress = outcome.progress as any;
      setProgress(nextProgress);
      setNewlyUnlockedAchievements(outcome.newlyUnlockedAchievements ?? []);

      // Detect "new level unlocked" (compare lock state for the immediate next preset).
      let unlockedTitle: string | null = null;
      try {
        if (r.success && selectedPreset) {
          const order = linearOrder ?? presets.map((p) => p.id);
          const idx = order.indexOf(selectedPreset.id);
          const nextId = idx >= 0 ? order[idx + 1] : null;
          if (nextId) {
            const before = resolveLockedForProgress(nextId, prevProgress).locked;
            const after = resolveLockedForProgress(nextId, nextProgress as any).locked;
            if (before && !after) {
              const p = presets.find((x) => x.id === nextId);
              unlockedTitle = p?.title ?? null;
            } else {
              unlockedTitle = null;
            }
          } else {
            unlockedTitle = null;
          }
        } else {
          unlockedTitle = null;
        }
      } catch {
        unlockedTitle = null;
      }
      setUnlockedPresetTitle(unlockedTitle);

      setResult(r);
      const hasDbAchievements = (outcome.newlyUnlockedAchievements?.length ?? 0) > 0;
      const hasUnlockedPresetNotice = !!(r.success && unlockedTitle);
      if (hasDbAchievements || hasUnlockedPresetNotice) setStep('achievements');
      else setStep('result');
    } catch {
      // Even if persistence fails, we still show the result screen.
      setResult(r);
      setStep('result');
      setEntryError('Не удалось сохранить прогресс. Проверь соединение и попробуй позже.');
    } finally {
      setBusy(false);
    }
  };

  const handleRetry = () => {
    if (!selectedPreset || !config) return;
    const next = { ...config, presetId: selectedPreset.id, attemptId: safeUuid() };
    startSession(next);
  };

  const handleNext = () => {
    if (!nextPresetId) return handleBackToSelect();
    const nextPreset = presets.find((p) => p.id === nextPresetId);
    if (!nextPreset) return handleBackToSelect();

    setSelectedPresetId(nextPreset.id);
    setAdvancedOpen(false);
    const nextCfg = { ...ensurePresetConfig(nextPreset), attemptId: safeUuid() };
    startSession(nextCfg);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStep('entry');
      setEntryError(null);
      try {
        const p = await definition.loadProgress();
        if (cancelled) return;
        setProgress(p);
        setStep('select');
      } catch {
        if (cancelled) return;
        setEntryError('Не удалось загрузить прогресс.');
        setStep('entry');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [definitionKey, entryReloadKey]); // depend on stable id, not object identity

  // Keep config in sync when preset selection changes.
  useEffect(() => {
    if (!selectedPreset) return;
    setAdvancedOpen(false);
    setConfig(ensurePresetConfig(selectedPreset));
  }, [selectedPreset?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  let content: React.ReactNode = null;

  if (step === 'entry') {
    content = (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card-elevated p-6 md:p-8 text-center space-y-4 w-full max-w-md">
          <div className="text-xl font-bold">{definition.meta.title}</div>
          <div className="text-muted-foreground">{entryError ? entryError : 'Загрузка…'}</div>
          {entryError ? (
            <div className="pt-2">
              <Button onClick={() => setEntryReloadKey((k) => k + 1)}>Повторить</Button>
            </div>
          ) : null}
        </div>
      </div>
    );
  } else if (step === 'select') {
    content = (
      <PresetSelect
        title={definition.meta.title}
        subtitle="Выбери уровень"
        onBack={() => window.location.assign(definition.meta.backHref)}
        presets={presets}
        selectedPresetId={selectedPresetId}
        isLocked={resolveLocked}
        isCompleted={resolveCompleted}
        onSelect={(id) => setSelectedPresetId(id)}
        onStart={handleStart}
        advanced={
          definition.advanced && canShowAdvanced && config && progress && selectedPreset
            ? {
                available: true,
                open: advancedOpen,
                onToggle: () => setAdvancedOpen((v) => !v),
                content: definition.advanced.render({
                  presetId: selectedPreset.id,
                  progress,
                  config,
                  setConfig: (next) => setConfig(next),
                }),
              }
            : undefined
        }
      />
    );
  } else if (step === 'session') {
    const textBadges = (sessionMetrics.badges?.filter((b) => b.kind === 'text') ?? []) as any[];
    const opponentText = textBadges.find((b) => b?.label === 'Соперник') as any;
    const otherText = textBadges.filter((b) => b?.label !== 'Соперник');
    content = config ? (
      <div key={sessionRunKey}>
        {definition.sessionFrame?.type === 'trainerGameFrame' ? (
          <TrainerGameFrame
            header={
              <div className="space-y-3 md:space-y-3 md:block">
                <div className="md:hidden -mx-4 px-4 py-2 bg-card border-b border-border/60">
                  <div className="h-14 flex items-center justify-between gap-3">
                    <Button variant="ghost" size="icon" onClick={handleBackToSelect} aria-label="Назад">
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="min-w-0 text-base font-bold text-foreground text-center flex-1 truncate whitespace-nowrap">
                      {definition.meta.title}
                    </h1>
                    {(() => {
                      const m = sessionMetrics.badges?.find((b) => b.kind === 'mistakes') as any;
                      return m ? (
                        <div className={cn('stats-badge', m.value > 0 && 'text-destructive')}>
                          <XCircle className="w-4 h-4" />
                          <span className="tabular-nums">{m.value}</span>
                        </div>
                      ) : (
                        <div className="w-10" />
                      );
                    })()}
                  </div>
                </div>

                <div className="hidden md:flex items-center justify-between gap-4">
                  <Button variant="ghost" size="icon" onClick={handleBackToSelect} aria-label="Назад">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <h1 className="text-xl md:text-2xl font-bold text-foreground text-center flex-1">{definition.meta.title}</h1>
                  <div className="w-10" />
                </div>

                {sessionMetrics.badges?.length ? (
                  <div className="space-y-3">
                    {(() => {
                      const main =
                        sessionMetrics.badges?.filter((b) => {
                          if (b.kind === 'text') return false;
                          // Race mode: ориентируемся на полосы прогресса, не показываем счетчик времени.
                          if (typeof sessionMetrics.opponentProgressPct === 'number' && b.kind === 'time') return false;
                          return true;
                        }) ?? [];
                      const time = sessionMetrics.badges?.find((b) => b.kind === 'time') as any;
                      const counter = sessionMetrics.badges?.find((b) => b.kind === 'counter') as any;
                      const canShowMobile = typeof sessionMetrics.opponentProgressPct !== 'number';
                      const isSpeedOrTimed = time?.mode === 'remaining';
                      return (
                        <>
                          {/* Mobile HUD layout */}
                          {canShowMobile ? (
                            <div className="md:hidden space-y-2">
                              {/* Training / Accuracy: time + progress in one row */}
                              {!isSpeedOrTimed && time && counter ? (
                                <div className="flex items-center justify-center gap-3">
                                  <div className="stats-badge">
                                    <Clock className="w-4 h-4" />
                                    <span className="tabular-nums">{Math.max(0, Math.floor(time.seconds))}с</span>
                                  </div>
                                  <div className="stats-badge">
                                    <Hash className="w-4 h-4" />
                                    <span className="tabular-nums">
                                      {counter.current}/{counter.total}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {time ? (
                                    <div className="flex justify-center">
                                      <div className="stats-badge">
                                        <Clock className="w-4 h-4" />
                                        <span>
                                          {time.label}: {Math.max(0, Math.floor(time.seconds))}с
                                        </span>
                                      </div>
                                    </div>
                                  ) : null}

                                  {/* Time remaining bar (Speed) */}
                                  {(() => {
                                    const t = sessionMetrics.badges?.find((b) => b.kind === 'time' && b.mode === 'remaining') as any;
                                    const total = Number(t?.totalSeconds || 0);
                                    const remaining = Number(t?.seconds || 0);
                                    if (!Number.isFinite(total) || total <= 0) return null;
                                    const pct = Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));
                                    const isLow = remaining <= 10;
                                    return (
                                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                          className={cn('h-full rounded-full transition-all duration-300', isLow ? 'bg-destructive' : 'bg-primary')}
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                    );
                                  })()}

                                  {counter ? (
                                    <div className="flex justify-center">
                                      <div className="stats-badge">
                                        <Hash className="w-4 h-4" />
                                        <span>
                                          Прогресс: {counter.current}/{counter.total}
                                        </span>
                                      </div>
                                    </div>
                                  ) : null}
                                </>
                              )}

                              {typeof sessionMetrics.progressPct === 'number' ? (
                                <div className="progress-bar">
                                  <div
                                    className="progress-bar-fill"
                                    style={{ width: `${Math.max(0, Math.min(100, Math.round(sessionMetrics.progressPct || 0)))}%` }}
                                  />
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {/* Desktop / non-mobile layout (original) */}
                          <div className={cn('hidden md:flex items-center justify-between gap-4 flex-wrap', !canShowMobile && 'flex')}>
                            {main.map((b, idx) => {
                      if (b.kind === 'counter') {
                        return (
                          <div key={idx} className="stats-badge">
                            <Hash className="w-4 h-4" />
                            <span>
                              {b.label}: {b.current}/{b.total}
                            </span>
                          </div>
                        );
                      }
                      if (b.kind === 'time') {
                        return (
                          <div key={idx} className="stats-badge">
                            <Clock className="w-4 h-4" />
                            <span>
                              {b.label}: {Math.max(0, Math.floor(b.seconds))}с
                            </span>
                          </div>
                        );
                      }
                      if (b.kind === 'mistakes') {
                        return (
                          <div key={idx} className={cn('stats-badge hidden md:flex', b.value > 0 && 'text-destructive')}>
                            <XCircle className="w-4 h-4" />
                            <span>
                              {b.label}: {b.value}
                            </span>
                          </div>
                        );
                      }
                      if (b.kind === 'stars') {
                        return (
                          <div key={idx} className="stats-badge">
                            <span className="font-bold">⭐</span>
                            <span>{b.value}</span>
                          </div>
                        );
                      }
                      return null;
                            })}
                          </div>

                    {/* Time remaining bar */}
                    {(() => {
                      // In race mode we show explicit opponent/user progress bars; hide time bar to avoid 3 stacked bars.
                      if (typeof sessionMetrics.opponentProgressPct === 'number') return null;
                      const t = sessionMetrics.badges?.find((b) => b.kind === 'time' && b.mode === 'remaining') as any;
                      const total = Number(t?.totalSeconds || 0);
                      const remaining = Number(t?.seconds || 0);
                      if (!Number.isFinite(total) || total <= 0) return null;
                      const pct = Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));
                      const isLow = remaining <= 10;
                      return (
                        <div className={cn('h-2 bg-muted rounded-full overflow-hidden', canShowMobile && 'hidden md:block')}>
                          <div className={cn('h-full rounded-full transition-all duration-300', isLow ? 'bg-destructive' : 'bg-primary')} style={{ width: `${pct}%` }} />
                        </div>
                      );
                    })()}

                          {otherText.length ? (
                            <div className="text-center text-sm text-muted-foreground">
                              {otherText
                                .map((b: any) => `${b.label}: ${b.value}`)
                                .filter(Boolean)
                                .join(' • ')}
                            </div>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>
                ) : null}
              </div>
            }
            progressPct={sessionMetrics.progressPct}
            opponentProgressPct={sessionMetrics.opponentProgressPct}
            opponentLabel={opponentText ? `Соперник: ${opponentText.value}` : undefined}
            selfLabel={typeof sessionMetrics.opponentProgressPct === 'number' ? 'Ты' : undefined}
            progressWrapperClassName={typeof sessionMetrics.opponentProgressPct === 'number' ? undefined : 'hidden md:block'}
          >
            {definition.renderSession({
              config,
              onFinish: handleFinish,
              onBackToSelect: handleBackToSelect,
              // Pass a stable setter to avoid effect loops in session components.
              setMetrics: setSessionMetrics,
            })}
          </TrainerGameFrame>
        ) : (
          definition.renderSession({ config, onFinish: handleFinish, onBackToSelect: handleBackToSelect })
        )}
      </div>
    ) : null;
  } else if (step === 'achievements') {
    const unlockedTitle = result?.success ? unlockedPresetTitle : null;
    content =
      (newlyUnlockedAchievements?.length ?? 0) > 0 || unlockedTitle ? (
        result && selectedPreset ? (
          <PostSessionAchievements
            achievements={newlyUnlockedAchievements}
            unlockedPresetTitle={unlockedTitle}
            title={definition.meta.title}
            presetTitle={selectedPreset.title}
            result={result}
            canGoNext={!!nextPresetId}
            nextPresetTitle={nextPresetId ? presets.find((p) => p.id === nextPresetId)?.title ?? null : null}
            onNextLevel={handleNext}
            onRetry={handleRetry}
            onBackToSelect={handleBackToSelect}
          />
        ) : null
      ) : null;
  } else {
    // result
    const nextPreset = nextPresetId ? presets.find((p) => p.id === nextPresetId) ?? null : null;
    content =
      result && selectedPreset ? (
        <div>
          <TrainerResultScreen
            title={definition.meta.title}
            presetTitle={selectedPreset.title}
            result={result}
            canGoNext={!!nextPresetId}
            nextPresetTitle={nextPreset?.title ?? null}
            onNextLevel={handleNext}
            onRetry={handleRetry}
            onBackToSelect={handleBackToSelect}
          />
          {entryError ? <div className="text-center text-sm text-muted-foreground -mt-6 pb-6 px-4">{entryError}</div> : null}
        </div>
      ) : null;
  }

  return (
    <div>
      {content}
      <CenteredOverlay open={busy}>
        <div className="card-elevated p-4">Сохранение…</div>
      </CenteredOverlay>
    </div>
  );
}

