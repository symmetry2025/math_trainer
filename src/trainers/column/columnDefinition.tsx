'use client';

import type { ComponentType } from 'react';
import { useEffect, useRef, useState } from 'react';

import type { TrainerConfig } from '../../data/trainerConfig';
import { getTrainerConfig, OPPONENT_NAMES } from '../../data/trainerConfig';
import { emitProgressUpdated } from '../../lib/crystals';
import { hydrateProgressFromDb, wasHydratedRecently } from '../../lib/progressHydration';
import { columnStorageKey } from '../../lib/trainerIds';
import type { PresetDefinition, SessionConfigBase, SessionResult, TrainerDefinition } from '../../trainerFlow';
import { RaceMode, TimedMode } from '../../trainerFlow/gameModes';
import type { SessionMetrics } from '../../trainerFlow';
import { TrainerRecordProgressResponseDtoSchema, type NewlyUnlockedAchievementDto } from '@smmtry/shared';

export type ColumnProgress = { accuracy: boolean; speed: boolean; raceStars: number }; // 0..3

type ColumnPresetId = 'training' | 'accuracy' | 'speed' | 'race:1' | 'race:2' | 'race:3';

export type ColumnSessionConfig = SessionConfigBase & {
  mode: 'training' | 'accuracy' | 'speed' | 'race';
  starLevel?: 1 | 2 | 3; // for race
  totalProblems: number;
  timeLimit?: number; // for speed
  npcSecondsPerProblem?: number; // for race
  trainerId: string; // 'column-addition' etc
};

type DifficultyForGame = 'easy' | 'medium' | 'hard';

type ColumnGameComponent = ComponentType<{
  difficulty?: DifficultyForGame;
  totalProblems?: number;
  onComplete?: (mistakes: number) => void;
  /** Live mistakes updates (for canonical HUD). Should be monotonic within an attempt. */
  onMistakesChange?: (mistakes: number) => void;
  onProblemSolved?: (solvedCount: number, totalProblems: number) => void;
  hideHeader?: boolean;
  hideProgress?: boolean;
  embedded?: boolean;
  onBack?: () => void;
  onNextLevel?: () => void;
}>;

const defaultProgress = (): ColumnProgress => ({ accuracy: false, speed: false, raceStars: 0 });

function clampStars(v: unknown): 0 | 1 | 2 | 3 {
  const n = Math.floor(Number(v || 0));
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  return 3;
}

function normalizeProgress(p: any): ColumnProgress {
  return { accuracy: !!p?.accuracy, speed: !!p?.speed, raceStars: clampStars(p?.raceStars) };
}

function storageKey(trainerId: string) {
  return columnStorageKey(trainerId);
}

function loadLocalProgress(trainerId: string): ColumnProgress {
  try {
    const raw = window.localStorage.getItem(storageKey(trainerId));
    if (!raw) return defaultProgress();
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return defaultProgress();
  }
}

function saveLocalProgress(trainerId: string, p: ColumnProgress) {
  try {
    window.localStorage.setItem(storageKey(trainerId), JSON.stringify(p));
  } catch {
    // ignore
  }
}

function makePresets(config: TrainerConfig): Array<PresetDefinition<ColumnSessionConfig, ColumnProgress>> {
  const accuracyTotal = config.accuracy.problems;
  const speedTotal = config.speed.problems;
  const speedLimit = config.speed.timeLimit || 60;
  const raceTotal = config.race.problems;

  return [
    {
      id: 'training',
      title: 'Тренировка',
      description: `Потренируйся без ограничений • ${accuracyTotal} примеров`,
      defaultConfig: { presetId: 'training', mode: 'training', totalProblems: accuracyTotal, trainerId: config.id },
      unlock: { isLocked: () => false },
    },
    {
      id: 'accuracy',
      title: 'Точность',
      description: `Реши все примеры без ошибок • ${accuracyTotal} примеров`,
      defaultConfig: { presetId: 'accuracy', mode: 'accuracy', totalProblems: accuracyTotal, trainerId: config.id },
      successPolicy: { type: 'noMistakes' },
      unlock: { isLocked: () => false },
    },
    {
      id: 'speed',
      title: 'Скорость',
      description: `Успей решить за ${speedLimit} секунд • ${speedTotal} примеров`,
      defaultConfig: { presetId: 'speed', mode: 'speed', totalProblems: speedTotal, timeLimit: speedLimit, trainerId: config.id },
      successPolicy: { type: 'custom', eval: ({ metrics }) => !!metrics.won, label: 'Успей за время' },
      unlock: {
        isLocked: ({ progress }) => !progress.accuracy,
        lockedReason: () => 'Сначала пройди “Точность”',
      },
    },
    {
      id: 'race:1',
      title: 'Новичок',
      description: `Реши ${raceTotal} примеров быстрее Новичка`,
      defaultConfig: {
        presetId: 'race:1',
        mode: 'race',
        starLevel: 1,
        totalProblems: raceTotal,
        npcSecondsPerProblem: config.npcSpeeds[1],
        trainerId: config.id,
      },
      successPolicy: { type: 'custom', eval: ({ metrics }) => !!metrics.won, label: 'Обгони соперника' },
      unlock: {
        isLocked: ({ progress }) => !progress.speed,
        lockedReason: () => 'Сначала пройди “Скорость”',
      },
    },
    {
      id: 'race:2',
      title: 'Знаток',
      description: `Реши ${raceTotal} примеров быстрее Знатока`,
      defaultConfig: {
        presetId: 'race:2',
        mode: 'race',
        starLevel: 2,
        totalProblems: raceTotal,
        npcSecondsPerProblem: config.npcSpeeds[2],
        trainerId: config.id,
      },
      successPolicy: { type: 'custom', eval: ({ metrics }) => !!metrics.won, label: 'Обгони соперника' },
      unlock: {
        isLocked: ({ progress }) => !progress.speed || progress.raceStars < 1,
        lockedReason: () => 'Сначала победи ⭐1',
      },
    },
    {
      id: 'race:3',
      title: 'Мастер',
      description: `Реши ${raceTotal} примеров быстрее Мастера`,
      defaultConfig: {
        presetId: 'race:3',
        mode: 'race',
        starLevel: 3,
        totalProblems: raceTotal,
        npcSecondsPerProblem: config.npcSpeeds[3],
        trainerId: config.id,
      },
      successPolicy: { type: 'custom', eval: ({ metrics }) => !!metrics.won, label: 'Обгони соперника' },
      unlock: {
        isLocked: ({ progress }) => !progress.speed || progress.raceStars < 2,
        lockedReason: () => 'Сначала победи ⭐2',
      },
    },
  ];
}

function gameDifficulty(mode: ColumnSessionConfig['mode']): DifficultyForGame {
  if (mode === 'training') return 'easy';
  if (mode === 'accuracy') return 'easy';
  if (mode === 'speed') return 'medium';
  return 'hard';
}

function ColumnSession(props: {
  config: ColumnSessionConfig;
  Game: ColumnGameComponent;
  onBackToSelect: () => void;
  onFinish: (r: SessionResult) => void;
  setMetrics?: (m: SessionMetrics) => void;
}) {
  const { config, Game, onBackToSelect, onFinish, setMetrics } = props;
  const [solved, setSolved] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [complete, setComplete] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [opponentProgressPct, setOpponentProgressPct] = useState(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    // reset per run
    setSolved(0);
    setMistakes(0);
    setComplete(false);
    setTimeRemaining(config.mode === 'speed' ? (config.timeLimit ?? 60) : null);
    setOpponentProgressPct(0);
    finishedRef.current = false;
  }, [config.attemptId]); // attemptId changes on start/retry

  const totalProblems = config.totalProblems;

  const emitFinishOnce = (r: SessionResult) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish(r);
  };

  // Live metrics for canonical session frame (TRN-005).
  useEffect(() => {
    if (!setMetrics) return;
    const progressPct = totalProblems > 0 ? Math.round((solved / totalProblems) * 100) : 0;
    const opponentLine =
      config.mode === 'race'
        ? {
            kind: 'text' as const,
            label: 'Соперник',
            value: `${OPPONENT_NAMES[config.starLevel ?? 1]}`,
          }
        : null;
    const badges: SessionMetrics['badges'] = [
      { kind: 'counter', label: 'Пример', current: Math.min(totalProblems, Math.max(0, solved + 1)), total: totalProblems },
      ...(config.mode === 'speed' && typeof timeRemaining === 'number'
        ? ([{ kind: 'time', label: 'Время', seconds: timeRemaining, mode: 'remaining', totalSeconds: config.timeLimit ?? 60 }] as const)
        : []),
      { kind: 'mistakes', label: 'Ошибки', value: mistakes },
      ...(opponentLine ? ([opponentLine] as const) : []),
    ];
    setMetrics({
      progressPct,
      opponentProgressPct: config.mode === 'race' ? opponentProgressPct : undefined,
      badges,
      total: totalProblems,
      solved,
      mistakes,
    });
  }, [setMetrics, solved, mistakes, totalProblems, config.mode, timeRemaining, opponentProgressPct]);

  // Accuracy completion => finish (no internal wrappers). Must be unconditional hook.
  useEffect(() => {
    if (config.mode !== 'accuracy') return;
    if (!(complete && solved >= totalProblems)) return;
    emitFinishOnce({
      success: mistakes === 0,
      metrics: { total: totalProblems, solved, mistakes },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.mode, complete, mistakes, solved, totalProblems]);

  // Training completion => finish (always success; does not unlock anything).
  useEffect(() => {
    if (config.mode !== 'training') return;
    if (!(complete && solved >= totalProblems)) return;
    emitFinishOnce({
      success: true,
      metrics: { total: totalProblems, solved, mistakes },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.mode, complete, solved, totalProblems, mistakes]);

  const commonGame = (
    <Game
      difficulty={gameDifficulty(config.mode)}
      totalProblems={totalProblems}
      onProblemSolved={(s) => setSolved(s)}
      onComplete={(m) => {
        setMistakes(m);
        setComplete(true);
      }}
      onMistakesChange={(m) => setMistakes(Math.max(0, Math.floor(Number(m || 0))))}
      hideHeader={true}
      hideProgress={true}
      embedded={true}
      onBack={onBackToSelect}
    />
  );

  if (config.mode === 'accuracy') {
    return commonGame;
  }

  if (config.mode === 'speed') {
    const timeLimit = config.timeLimit ?? 60;
    return (
      <TimedMode
        timeLimit={timeLimit}
        totalProblems={totalProblems}
        solvedProblems={solved}
        mistakes={mistakes}
        isGameComplete={complete}
        hideHud={true}
        onTick={(tr) => setTimeRemaining(tr)}
        onTimeEnd={(timeElapsed, success) => {
          emitFinishOnce({
            success,
            metrics: { total: totalProblems, solved, mistakes, timeSec: timeElapsed, won: success },
          });
        }}
      >
        {commonGame}
      </TimedMode>
    );
  }

  // race
  const starLevel = config.starLevel ?? 1;
  const npcSecondsPerProblem = config.npcSecondsPerProblem ?? 12;
  return (
    <RaceMode
      totalProblems={totalProblems}
      solvedProblems={solved}
      mistakes={mistakes}
      npcSecondsPerProblem={npcSecondsPerProblem}
      opponentLevel={starLevel}
      opponentName={OPPONENT_NAMES[starLevel]}
      isGameComplete={complete}
      hideHud={true}
      onOpponentProgressPct={(pct) => setOpponentProgressPct(pct)}
      onRaceEnd={(playerWon, stars) => {
        emitFinishOnce({
          success: playerWon,
          metrics: { total: totalProblems, solved, mistakes, won: playerWon, starsEarned: clampStars(stars) },
        });
      }}
    >
      {commonGame}
    </RaceMode>
  );
}

export function makeColumnDefinition(args: {
  trainerId: string;
  backHref: string;
  Game: ColumnGameComponent;
}): TrainerDefinition<ColumnProgress, ColumnSessionConfig> {
  const config = getTrainerConfig(args.trainerId);
  const presets = makePresets(config);

  return {
    meta: {
      id: args.trainerId,
      slug: args.trainerId,
      title: config.name,
      backHref: args.backHref,
      archetype: 'column',
    },

    presets,

    unlockPolicy: {
      type: 'custom',
      isLocked: ({ presetId, progress }) => {
        const p = progress as any;
        if (presetId === 'speed') return !p?.accuracy;
        if (presetId === 'race:1') return !p?.speed;
        if (presetId === 'race:2') return !p?.speed || Number(p?.raceStars || 0) < 1;
        if (presetId === 'race:3') return !p?.speed || Number(p?.raceStars || 0) < 2;
        return false; // training + accuracy are open by default
      },
    },

    sessionFrame: { type: 'trainerGameFrame' },

    loadProgress: async () => {
      let local = loadLocalProgress(args.trainerId);
      try {
        if (!wasHydratedRecently(args.trainerId, 60_000)) {
          const did = await hydrateProgressFromDb(args.trainerId);
          if (did) {
            local = loadLocalProgress(args.trainerId);
            emitProgressUpdated();
          }
        }
      } catch {
        // ignore
      }
      return local;
    },

    renderSession: ({ config: sessionConfig, onFinish, onBackToSelect, setMetrics }) => {
      // Keep derived fields deterministic per preset.
      const preset = presets.find((p) => p.id === sessionConfig.presetId);
      const base = preset?.defaultConfig;
      const next: ColumnSessionConfig = base
        ? { ...base, attemptId: sessionConfig.attemptId }
        : sessionConfig;

      return <ColumnSession config={next} Game={args.Game} onBackToSelect={onBackToSelect} onFinish={onFinish} setMetrics={setMetrics} />;
    },

    recordResult: async ({ config: sessionConfig, result }) => {
      const prev = loadLocalProgress(args.trainerId);
      const next: ColumnProgress = { ...prev };

      const total = Math.max(0, Math.floor(Number(result.metrics.total || sessionConfig.totalProblems || 0)));
      const solved = Math.max(0, Math.floor(Number(result.metrics.solved || 0)));
      const mistakes = Math.max(0, Math.floor(Number(result.metrics.mistakes || 0)));
      const time = Math.max(0, Math.floor(Number(result.metrics.timeSec || 0)));

      // Training is non-progressing (no rewards, no unlocks).
      if (sessionConfig.mode === 'training') {
        return { progress: prev, newlyUnlockedAchievements: [] };
      }

      // Update local monotonic progress
      if (sessionConfig.mode === 'accuracy') {
        if (mistakes === 0) next.accuracy = true;
      } else if (sessionConfig.mode === 'speed') {
        if (result.success) next.speed = true;
      } else {
        const stars = clampStars(result.metrics.starsEarned || 0);
        if (stars > next.raceStars) next.raceStars = stars;
      }
      saveLocalProgress(args.trainerId, next);
      emitProgressUpdated();

      // Best effort server record
      let newlyUnlockedAchievements: NewlyUnlockedAchievementDto[] = [];
      try {
        const level = sessionConfig.mode;
        const body: any =
          level === 'accuracy'
            ? {
                trainerId: args.trainerId,
                attemptId: sessionConfig.attemptId,
                kind: 'column',
                level: 'accuracy',
                total,
                solved: total,
                mistakes,
                time: 0,
                success: mistakes === 0,
              }
            : level === 'speed'
              ? {
                  trainerId: args.trainerId,
                  attemptId: sessionConfig.attemptId,
                  kind: 'column',
                  level: 'speed',
                  total,
                  solved,
                  mistakes,
                  time,
                  success: result.success,
                }
              : {
                  trainerId: args.trainerId,
                  attemptId: sessionConfig.attemptId,
                  kind: 'column',
                  level: 'race',
                  total,
                  solved,
                  mistakes,
                  time: 0,
                  stars: clampStars(result.metrics.starsEarned || 0),
                  won: !!result.success,
                };

        const res = await fetch('/api/progress/record', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify(body),
        });
        const json: any = await res.json().catch(() => null);
        const parsed = TrainerRecordProgressResponseDtoSchema.safeParse(json);
        if (parsed.success) newlyUnlockedAchievements = parsed.data.newlyUnlockedAchievements ?? [];
        const p = (parsed.success ? parsed.data.progress : json?.progress) as any;
        if (p) {
          const server = normalizeProgress(p);
          saveLocalProgress(args.trainerId, server);
          emitProgressUpdated();
          return { progress: server, newlyUnlockedAchievements };
        }
      } catch {
        // ignore
      }

      return { progress: next, newlyUnlockedAchievements };
    },
  };
}

