'use client';

import { TrainerRecordProgressResponseDtoSchema, type NewlyUnlockedAchievementDto } from '@smmtry/shared';

import { getNumberCompositionConfig } from '../../data/numberCompositionConfig';
import { emitProgressUpdated } from '../../lib/stars';
import { hydrateProgressFromDb, wasHydratedRecently } from '../../lib/progressHydration';
import { arithmeticDbTrainerId, arithmeticStorageKey } from '../../lib/trainerIds';
import type { PresetDefinition, SessionConfigBase, SessionResult, TrainerDefinition } from '../../trainerFlow';
import { NumberCompositionSession } from './NumberCompositionSession';
import { HouseNumbersSession } from './HouseNumbersSession';
import { defaultVisualMentalProgress, normalizeVisualMentalProgress, type VisualMentalProgress } from './visualProgress';
import { MENTAL_MATH_OPPONENT_NAMES } from '../../data/mentalMathConfig';

export type NumberCompositionSessionConfig = SessionConfigBase & {
  level: 'accuracy-choice' | 'accuracy-input' | 'race';
  starLevel?: 2 | 3;
  npcSecondsPerProblem?: number;
  minSum: number;
  maxSum: number;
  totalProblems: number;
};

function loadLocalProgress(trainerId: string): VisualMentalProgress {
  try {
    const raw = window.localStorage.getItem(arithmeticStorageKey(trainerId));
    if (!raw) return defaultVisualMentalProgress();
    return normalizeVisualMentalProgress(JSON.parse(raw));
  } catch {
    return defaultVisualMentalProgress();
  }
}

function saveLocalProgress(trainerId: string, p: VisualMentalProgress) {
  try {
    window.localStorage.setItem(arithmeticStorageKey(trainerId), JSON.stringify(p));
  } catch {
    // ignore
  }
}

function makePresets(
  range: { minSum: number; maxSum: number },
): Array<PresetDefinition<NumberCompositionSessionConfig, VisualMentalProgress>> {
  const base = (level: 'accuracy-choice' | 'accuracy-input', totalProblems: number) => ({
    presetId: level,
    level,
    minSum: range.minSum,
    maxSum: range.maxSum,
    totalProblems,
  });

  return [
    {
      id: 'accuracy-choice',
      title: 'Тренировка',
      description: 'Заполни пропуск • 10 примеров',
      defaultConfig: base('accuracy-choice', 10),
      successPolicy: { type: 'minAccuracy', min: 0.8 },
    },
    {
      id: 'accuracy-input',
      title: 'Точность',
      description: 'Заполни пропуск • 20 примеров',
      defaultConfig: base('accuracy-input', 20),
      successPolicy: { type: 'minAccuracy', min: 0.8 },
    },
    {
      id: 'race:2',
      title: 'Знаток',
      description: 'Реши 20 примеров быстрее Знатока',
      defaultConfig: { presetId: 'race:2', level: 'race', starLevel: 2, npcSecondsPerProblem: 5, ...range, totalProblems: 20 },
      successPolicy: { type: 'custom', eval: ({ metrics }) => !!metrics.won, label: 'Обгони соперника' },
    },
    {
      id: 'race:3',
      title: 'Мастер',
      description: 'Реши 20 примеров быстрее Мастера',
      defaultConfig: { presetId: 'race:3', level: 'race', starLevel: 3, npcSecondsPerProblem: 4, ...range, totalProblems: 20 },
      successPolicy: { type: 'custom', eval: ({ metrics }) => !!metrics.won, label: 'Обгони соперника' },
    },
  ];
}

function totalHouseCells(range: { minSum: number; maxSum: number }) {
  let total = 0;
  for (let s = range.minSum; s <= range.maxSum; s++) total += s + 1;
  return total;
}

export function makeNumberCompositionDefinition(args: { trainerId: string; backHref: string }): TrainerDefinition<VisualMentalProgress, NumberCompositionSessionConfig> {
  const cfg = getNumberCompositionConfig(args.trainerId);
  const dbTrainerId = arithmeticDbTrainerId(cfg.id);
  const range = { minSum: cfg.minSum, maxSum: cfg.maxSum };
  const isHouse = cfg.variant === 'house';
  const houseTotal = isHouse ? totalHouseCells(range) : null;
  const presets: Array<PresetDefinition<NumberCompositionSessionConfig, VisualMentalProgress>> = isHouse
    ? [
        {
          id: 'accuracy-choice',
          title: 'Тренировка',
          description: `Заполни домики • ${houseTotal} ячеек`,
          defaultConfig: { presetId: 'accuracy-choice', level: 'accuracy-choice', ...range, totalProblems: houseTotal || 10 },
          successPolicy: { type: 'minAccuracy', min: 0.8 },
        },
        {
          id: 'accuracy-input',
          title: 'Точность',
          description: `Заполни домики • ${houseTotal} ячеек`,
          defaultConfig: { presetId: 'accuracy-input', level: 'accuracy-input', ...range, totalProblems: houseTotal || 10 },
          successPolicy: { type: 'minAccuracy', min: 0.8 },
        },
        {
          id: 'race:2',
          title: 'Знаток',
          description: `Заполни домики быстрее Знатока • ${houseTotal} ячеек`,
          defaultConfig: { presetId: 'race:2', level: 'race', starLevel: 2, npcSecondsPerProblem: 5, ...range, totalProblems: houseTotal || 10 },
          successPolicy: { type: 'custom', eval: ({ metrics }) => !!metrics.won, label: 'Обгони соперника' },
        },
        {
          id: 'race:3',
          title: 'Мастер',
          description: `Заполни домики быстрее Мастера • ${houseTotal} ячеек`,
          defaultConfig: { presetId: 'race:3', level: 'race', starLevel: 3, npcSecondsPerProblem: 4, ...range, totalProblems: houseTotal || 10 },
          successPolicy: { type: 'custom', eval: ({ metrics }) => !!metrics.won, label: 'Обгони соперника' },
        },
      ]
    : makePresets(range);

  return {
    meta: {
      id: dbTrainerId,
      slug: `arithmetic/${cfg.id}`,
      title: cfg.name,
      backHref: args.backHref,
      archetype: 'visual',
    },

    presets,
    unlockPolicy: {
      type: 'custom',
      isLocked: ({ presetId, progress }) => {
        const p = progress as any;
        if (presetId === 'race:2') return !p?.['accuracy-input'];
        if (presetId === 'race:3') return Number(p?.raceStars || 0) < 2;
        return false; // training + accuracy are open by default
      },
    },
    sessionFrame: { type: 'trainerGameFrame' },

    loadProgress: async () => {
      let local = loadLocalProgress(cfg.id);
      try {
        if (!wasHydratedRecently(dbTrainerId, 60_000)) {
          const did = await hydrateProgressFromDb(dbTrainerId);
          if (did) local = loadLocalProgress(cfg.id);
        }
      } catch {
        // ignore
      }
      return local;
    },

    renderSession: ({ config, onFinish, setMetrics }) => {
      return (
        isHouse ? (
          <HouseNumbersSession
            attemptId={config.attemptId}
            minSum={config.minSum}
            maxSum={config.maxSum}
            totalProblems={config.totalProblems}
            level={config.level}
            starLevel={config.starLevel}
            npcSecondsPerProblem={config.npcSecondsPerProblem}
            setMetrics={setMetrics}
            onFinish={({ correct, solved, total, mistakes, timeSec, won, starsEarned }) => {
              const level = config.level;
              const success = level === 'race' ? !!won : total > 0 ? correct >= total * 0.8 : false;
              const result: SessionResult = { success, metrics: { total, solved, correct, mistakes, timeSec, won: !!won, starsEarned } };
              onFinish(result);
            }}
          />
        ) : (
          <NumberCompositionSession
            attemptId={config.attemptId}
            minSum={config.minSum}
            maxSum={config.maxSum}
            totalProblems={config.totalProblems}
            level={config.level}
            starLevel={config.starLevel}
            npcSecondsPerProblem={config.npcSecondsPerProblem}
            setMetrics={setMetrics}
            onFinish={({ correct, solved, total, mistakes, timeSec, won, starsEarned }) => {
              const level = config.level;
              const success = level === 'race' ? !!won : total > 0 ? correct >= total * 0.8 : false;
              const result: SessionResult = { success, metrics: { total, solved, correct, mistakes, timeSec, won: !!won, starsEarned } };
              onFinish(result);
            }}
          />
        )
      );
    },

    recordResult: async ({ config, result }) => {
      const prev = loadLocalProgress(cfg.id);
      const next: VisualMentalProgress = { ...prev };

      const total = Math.max(0, Math.floor(Number(result.metrics.total || 0)));
      const correct = Math.max(0, Math.floor(Number(result.metrics.correct || 0)));
      const mistakes = Math.max(0, Math.floor(Number(result.metrics.mistakes || 0)));
      const time = Math.max(0, Math.floor(Number(result.metrics.timeSec || 0)));

      if (config.level === 'accuracy-choice' && result.success) next['accuracy-choice'] = true;
      if (config.level === 'accuracy-input' && result.success) next['accuracy-input'] = true;
      if (config.level === 'race') {
        const star = Math.max(2, Math.min(3, Math.floor(Number(config.starLevel || 2)))) as 2 | 3;
        if (!!result.metrics.won) next.raceStars = Math.max(next.raceStars, star);
      }

      saveLocalProgress(cfg.id, next);
      emitProgressUpdated();

      let newlyUnlockedAchievements: NewlyUnlockedAchievementDto[] = [];
      try {
        const presetId = String(config.presetId || '');
        const isRace = presetId.startsWith('race:') || config.level === 'race';
        const starLevel = isRace ? (Math.max(2, Math.min(3, Number(config.starLevel || presetId.split(':')[1] || 2))) as 2 | 3) : undefined;
        const level = isRace ? 'race' : config.level;
        const won = !!result.metrics.won;
        const res = await fetch('/api/progress/record', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({
            trainerId: dbTrainerId,
            attemptId: config.attemptId,
            kind: 'mental',
            level,
            total,
            correct,
            mistakes,
            time,
            won,
            starLevel,
          }),
        });
        const json: any = await res.json().catch(() => null);
        const parsed = TrainerRecordProgressResponseDtoSchema.safeParse(json);
        if (parsed.success) newlyUnlockedAchievements = parsed.data.newlyUnlockedAchievements ?? [];
        const p = (parsed.success ? parsed.data.progress : json?.progress) as any;
        if (p) {
          saveLocalProgress(cfg.id, normalizeVisualMentalProgress(p));
          emitProgressUpdated();
        }
      } catch {
        // ignore
      }

      return { progress: next, newlyUnlockedAchievements };
    },
  };
}

