'use client';

import type { ReactNode } from 'react';

import { ArrowLeft, Lock, Shield, Swords, Target, Settings } from 'lucide-react';

import type { PresetDefinition, PresetId, SessionConfigBase } from '../types';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';

function presetUi(presetId: string): {
  icon: ReactNode;
  iconWrapClassName: string;
  rewardKind: 'none' | 'stars';
  rewardValue?: number;
} {
  // NOTE: This is intentionally simple/heuristic. Presets are still the source of truth.
  if (presetId === 'training' || presetId === 'accuracy-choice' || presetId === 'lvl1') {
    return {
      icon: <Shield className="w-6 h-6 text-primary" />,
      iconWrapClassName: 'bg-primary/10 border-primary/15',
      rewardKind: 'none', // training => no reward
    };
  }
  if (presetId === 'accuracy' || presetId === 'accuracy-input' || presetId === 'lvl2') {
    return {
      icon: <Target className="w-6 h-6 text-primary" />,
      iconWrapClassName: 'bg-primary/10 border-primary/15',
      rewardKind: 'stars',
      rewardValue: 1,
    };
  }
  if (String(presetId).startsWith('race:')) {
    const n = Math.max(1, Math.min(3, Math.floor(Number(String(presetId).split(':')[1] || 1))));
    return {
      icon: <Swords className="w-6 h-6 text-primary" />,
      iconWrapClassName: 'bg-primary/10 border-primary/15',
      rewardKind: 'stars',
      rewardValue: n,
    };
  }
  return {
    icon: <Shield className="w-6 h-6 text-primary" />,
    iconWrapClassName: 'bg-primary/10 border-primary/15',
    rewardKind: 'none',
  };
}

export function PresetSelect<TProgress, TConfig extends SessionConfigBase>(props: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  presets: Array<PresetDefinition<TConfig, TProgress>>;
  selectedPresetId: PresetId | null;
  isLocked: (presetId: PresetId) => { locked: boolean; reason?: string | null };
  isCompleted: (presetId: PresetId) => boolean;
  onSelect: (presetId: PresetId) => void;
  onStart: () => void;
  startDisabled?: boolean;

  advanced?: {
    available: boolean;
    open: boolean;
    onToggle: () => void;
    content: ReactNode;
  };
}) {
  const selected = props.selectedPresetId ? props.presets.find((p) => p.id === props.selectedPresetId) : null;
  const selectedLock = selected ? props.isLocked(selected.id) : { locked: true as const, reason: null };
  const startDisabled = props.startDisabled ?? (!selected || selectedLock.locked);

  return (
    <div
      className="min-h-[100svh] md:min-h-screen pt-6 px-4 md:py-10 md:px-8 flex flex-col"
      style={{ ['--startbar-h' as any]: '88px' }}
    >
      <div className="max-w-6xl mx-auto w-full flex-1 min-h-0">
        <div className={cn('mb-6 md:mb-8', props.onBack ? 'text-left' : 'text-center')}>
          {props.onBack ? (
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="icon" onClick={props.onBack} aria-label="Назад">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold">{props.title}</h1>
                {props.subtitle ? <p className="text-muted-foreground mt-1">{props.subtitle}</p> : null}
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl md:text-3xl font-extrabold">{props.title}</h1>
              {props.subtitle ? <p className="text-muted-foreground mt-2">{props.subtitle}</p> : null}
            </>
          )}
        </div>

        <div className="grid gap-3 pb-[calc(var(--startbar-h)+env(safe-area-inset-bottom)+16px)] md:pb-0">
          {props.presets.map((preset) => {
            const lock = props.isLocked(preset.id);
            const isSelected = preset.id === props.selectedPresetId;
            const ui = presetUi(String(preset.id));
            const completed = props.isCompleted(preset.id);
            const reward =
              ui.rewardKind === 'stars' ? (
                <div className="inline-flex items-center gap-1 text-muted-foreground">
                  <span className="font-bold">⭐</span>
                  <span className="tabular-nums font-semibold">{ui.rewardValue ?? 1}</span>
                </div>
              ) : null;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  if (lock.locked) return;
                  props.onSelect(preset.id);
                }}
                className={cn(
                  'relative text-left w-full card-elevated p-4 md:p-5 transition-colors overflow-hidden',
                  isSelected ? 'ring-2 ring-primary/40 bg-primary/5' : 'hover:bg-muted/30',
                  lock.locked && 'opacity-70 cursor-not-allowed hover:bg-transparent',
                )}
                aria-disabled={lock.locked}
              >
                {/* Locked overlay */}
                {lock.locked ? (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-14 h-14 rounded-full bg-background/70 border border-border/60 backdrop-blur-sm flex items-center justify-center shadow-sm">
                      <Lock className="w-7 h-7 text-muted-foreground" />
                    </div>
                  </div>
                ) : null}

                <div className={cn('flex items-center gap-4', lock.locked && 'blur-[0.5px]')}>
                  <div
                    className={cn(
                      'w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0',
                      ui.iconWrapClassName,
                    )}
                  >
                    {ui.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-base md:text-lg font-bold truncate">{preset.title}</div>
                    {preset.description ? <div className="text-sm text-muted-foreground mt-1">{preset.description}</div> : null}
                  </div>

                  <div className="shrink-0 min-w-[92px] flex items-center justify-end">
                    {completed && reward ? (
                      <div className="text-right leading-tight text-muted-foreground opacity-80">
                        <div className="text-[11px]">Заработано</div>
                        <div className="mt-0.5">{reward}</div>
                      </div>
                    ) : (
                      reward
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {props.advanced?.available ? (
          <div className="mt-5">
            <button
              type="button"
              onClick={props.advanced.onToggle}
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="w-4 h-4" />
              {props.advanced.open ? 'Скрыть расширенные настройки' : 'Расширенные настройки'}
            </button>
            {props.advanced.open ? <div className="mt-3 card-elevated p-4 md:p-5">{props.advanced.content}</div> : null}
          </div>
        ) : null}

        <div className="hidden md:flex mt-6 md:mt-8 justify-center">
          <Button size="lg" onClick={props.onStart} disabled={startDisabled} className="w-full sm:w-auto min-w-[220px]">
            Начать
          </Button>
        </div>
      </div>

      <div className="md:hidden sticky bottom-0 left-0 right-0 -mx-4 bg-background border-t border-border/60 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <Button size="lg" onClick={props.onStart} disabled={startDisabled} className="w-full rounded-none h-14">
          Начать
        </Button>
      </div>
    </div>
  );
}

