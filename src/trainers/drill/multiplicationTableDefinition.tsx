'use client';

import { useMemo } from 'react';

import type { PresetDefinition, SessionConfigBase, SessionResult, TrainerDefinition } from '../../trainerFlow';
import { MultiplicationTableSession, type MultiplicationTableSessionConfig } from './MultiplicationTableSession';
import { emitProgressUpdated } from '../../lib/stars';
import { hydrateProgressFromDb, wasHydratedRecently } from '../../lib/progressHydration';
import { progressStorageKey } from '../../lib/trainerIds';
import { TrainerRecordProgressResponseDtoSchema, type NewlyUnlockedAchievementDto } from '@smmtry/shared';

type MultiplicationTableConfig = SessionConfigBase & MultiplicationTableSessionConfig;

type MultiplicationTableProgress = {
  lvl1: boolean;
  lvl2: boolean;
  raceStars: 0 | 1 | 2 | 3;
};

function defaultProgress(): MultiplicationTableProgress {
  return { lvl1: false, lvl2: false, raceStars: 0 };
}

function clampStars(v: unknown): 0 | 1 | 2 | 3 {
  const n = Math.floor(Number(v || 0));
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  return 3;
}

function normalizeProgress(p: any): MultiplicationTableProgress {
  return {
    lvl1: !!p?.lvl1,
    lvl2: !!p?.lvl2,
    raceStars: clampStars(p?.raceStars),
  };
}

function loadLocalProgress(storageKey: string): MultiplicationTableProgress {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaultProgress();
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return defaultProgress();
  }
}

function saveLocalProgress(storageKey: string, p: MultiplicationTableProgress) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(p));
  } catch {
    // ignore
  }
}

function makePresets(multiplier: number): Array<PresetDefinition<MultiplicationTableConfig, MultiplicationTableProgress>> {
  const base: Omit<MultiplicationTableConfig, 'presetId' | 'attemptId'> = {
    order: 'mixed',
    answerInputMode: 'choice',
    totalProblems: 10,
    selectedMultipliers: [multiplier],
    highlightRow: false,
    helper: null,
  };

  return [
    {
      id: 'lvl1',
      title: 'Тренировка',
      description: 'На выбор • по порядку • 10 примеров',
      defaultConfig: { presetId: 'lvl1', ...base, order: 'ordered', totalProblems: 10, answerInputMode: 'choice' },
      unlock: { isLocked: () => false },
      successPolicy: { type: 'minAccuracy', min: 0.8 },
    },
    {
      id: 'lvl2',
      title: 'Точность',
      description: 'На выбор • вперемешку • 10 примеров',
      defaultConfig: { presetId: 'lvl2', ...base, order: 'mixed', totalProblems: 10, answerInputMode: 'choice' },
      unlock: { isLocked: () => false },
      successPolicy: { type: 'minAccuracy', min: 0.8 },
    },
    {
      id: 'race:2',
      title: 'Знаток',
      description: 'Реши 36 примеров быстрее Знатока • 4с/пример',
      defaultConfig: { presetId: 'race:2', ...base, order: 'mixed', totalProblems: 36, answerInputMode: 'manual', race: { starLevel: 2, npcSecondsPerProblem: 4 } },
      unlock: { isLocked: ({ progress }) => !progress.lvl2, lockedReason: () => 'Сначала пройди Точность' },
      successPolicy: { type: 'custom', eval: ({ metrics }) => !!metrics.won, label: 'Обгони соперника' },
    },
    {
      id: 'race:3',
      title: 'Мастер',
      description: 'Реши 36 примеров быстрее Мастера • 2с/пример',
      defaultConfig: { presetId: 'race:3', ...base, order: 'mixed', totalProblems: 36, answerInputMode: 'manual', race: { starLevel: 3, npcSecondsPerProblem: 2 } },
      unlock: { isLocked: ({ progress }) => progress.raceStars < 2, lockedReason: () => 'Сначала победи ⭐2' },
      successPolicy: { type: 'custom', eval: ({ metrics }) => !!metrics.won, label: 'Обгони соперника' },
    },
  ];
}

function makePresetsFull(): Array<PresetDefinition<MultiplicationTableConfig, MultiplicationTableProgress>> {
  const all = [2, 3, 4, 5, 6, 7, 8, 9];
  return makePresetsSet(all);
}

function makePresetsSet(multipliers: number[]): Array<PresetDefinition<MultiplicationTableConfig, MultiplicationTableProgress>> {
  const base: Omit<MultiplicationTableConfig, 'presetId' | 'attemptId'> = {
    order: 'mixed',
    answerInputMode: 'choice',
    totalProblems: 20,
    selectedMultipliers: multipliers,
    highlightRow: false,
    helper: null,
  };

  return [
    {
      id: 'lvl1',
      title: 'Тренировка',
      description: 'На выбор • по порядку • 20 примеров',
      defaultConfig: { presetId: 'lvl1', ...base, order: 'ordered', totalProblems: 20, answerInputMode: 'choice' },
      unlock: { isLocked: () => false },
      successPolicy: { type: 'minAccuracy', min: 0.8 },
    },
    {
      id: 'lvl2',
      title: 'Точность',
      description: 'На выбор • вперемешку • 20 примеров',
      defaultConfig: { presetId: 'lvl2', ...base, order: 'mixed', totalProblems: 20, answerInputMode: 'choice' },
      unlock: { isLocked: () => false },
      successPolicy: { type: 'minAccuracy', min: 0.8 },
    },
    {
      id: 'race:2',
      title: 'Знаток',
      description: 'Реши 36 примеров быстрее Знатока • 4с/пример',
      defaultConfig: { presetId: 'race:2', ...base, order: 'mixed', totalProblems: 36, answerInputMode: 'manual', race: { starLevel: 2, npcSecondsPerProblem: 4 } },
      unlock: { isLocked: ({ progress }) => !progress.lvl2, lockedReason: () => 'Сначала пройди Точность' },
      successPolicy: { type: 'custom', eval: ({ metrics }) => !!metrics.won, label: 'Обгони соперника' },
    },
    {
      id: 'race:3',
      title: 'Мастер',
      description: 'Реши 36 примеров быстрее Мастера • 2с/пример',
      defaultConfig: { presetId: 'race:3', ...base, order: 'mixed', totalProblems: 36, answerInputMode: 'manual', race: { starLevel: 3, npcSecondsPerProblem: 2 } },
      unlock: { isLocked: ({ progress }) => progress.raceStars < 2, lockedReason: () => 'Сначала победи ⭐2' },
      successPolicy: { type: 'custom', eval: ({ metrics }) => !!metrics.won, label: 'Обгони соперника' },
    },
  ];
}

function makeMultiplicationTableDefinition(args: {
  backHref: string;
  /** Canonical exercise id from route: `mul-table-<n>` */
  exerciseId: string;
}): TrainerDefinition<MultiplicationTableProgress, MultiplicationTableConfig> {
  const exId = String(args.exerciseId || '').trim();
  const isFull = exId === 'mul-table-full';
  const isLimited25 = exId === 'mul-table-2-5';
  const initialMultiplier = (() => {
    const m = exId.match(/^mul-table-(\d+)$/);
    if (m) {
      const n = Math.max(1, Math.min(10, Number(m[1])));
      return n;
    }
    // invalid exercise id => default: 1 (route-level 404 is handled elsewhere)
    return 1;
  })();

  const presets = isFull ? makePresetsFull() : isLimited25 ? makePresetsSet([2, 3, 4, 5]) : makePresets(initialMultiplier);
  const dbTrainerId = `arithmetic:${args.exerciseId}`;
  const progressStorageKeyStr = progressStorageKey(dbTrainerId);

  return {
    meta: {
      id: dbTrainerId,
      slug: `arithmetic/${args.exerciseId}`,
      title: 'Таблица умножения',
      backHref: args.backHref,
      archetype: 'drill',
    },

    presets,

    unlockPolicy: {
      type: 'linear',
      order: presets.map((p) => p.id),
      isCompleted: ({ presetId, progress }) => {
        if (presetId === 'lvl1') return !!(progress as any).lvl1;
        if (presetId === 'lvl2') return !!(progress as any).lvl2;
        if (String(presetId).startsWith('race:')) {
          const n = Number(String(presetId).split(':')[1] || 0);
          return Number((progress as any).raceStars || 0) >= n;
        }
        return false;
      },
    },

    sessionFrame: { type: 'trainerGameFrame' },

    loadProgress: async () => {
      // Prefer server progress (with localStorage as cache). Keep TTL short to avoid duplicate calls
      // during page transitions (trainer list already hydrates it).
      if (!wasHydratedRecently(dbTrainerId, 60_000)) {
        await hydrateProgressFromDb(dbTrainerId);
      }
      return loadLocalProgress(progressStorageKeyStr);
    },

    renderSession: ({ config, onFinish, setMetrics }) => {
      return (
        <MultiplicationTableSession
          config={config}
          setMetrics={setMetrics}
          onFinish={({ correct, solved, total, mistakes, timeSec, won, starsEarned }) => {
            const id = String(config.presetId || '');
            const isRace = id.startsWith('race:');

            const success = isRace ? !!won : correct >= total * 0.8;
            const result: SessionResult = {
              success,
              metrics: {
                correct,
                solved,
                total,
                mistakes,
                timeSec,
                won: !!won,
                starsEarned: starsEarned,
              },
            };
            onFinish(result);
          }}
        />
      );
    },

    recordResult: async ({ config, result }) => {
      const id = String(config.presetId || '');
      const isRace = id.startsWith('race:');
      const starLevel = isRace
        ? (Number(id.split(':')[1] || 2) as 2 | 3)
        : undefined;

      const correct = Math.max(0, Math.floor(Number(result.metrics.correct || 0)));
      const total = Math.max(0, Math.floor(Number(result.metrics.total || 0)));
      const mistakes = Math.max(0, Math.floor(Number(result.metrics.mistakes || 0)));
      const time = Math.max(0, Math.floor(Number(result.metrics.timeSec || 0)));
      const won = !!result.metrics.won;

      // 1) Persist to server (source of truth)
      let nextProgress: MultiplicationTableProgress | null = null;
      let newlyUnlockedAchievements: NewlyUnlockedAchievementDto[] = [];
      try {
        const level = isRace ? 'race' : (id as 'lvl1' | 'lvl2');
        const res = await fetch('/api/progress/record', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            trainerId: dbTrainerId,
            attemptId: config.attemptId,
            kind: 'drill',
            level,
            correct,
            total,
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
        if (res.ok && p) nextProgress = normalizeProgress(p);
      } catch {
        // ignore (will fall back to local update)
      }

      // 2) Local cache update (best-effort), so trainer list updates instantly
      if (!nextProgress) {
        const prevProgress = loadLocalProgress(progressStorageKeyStr);
        const fallback: MultiplicationTableProgress = { ...prevProgress };
        if (result.success) {
          if (id === 'lvl1') fallback.lvl1 = true;
          else if (id === 'lvl2') fallback.lvl2 = true;
          else if (isRace) {
            const stars = clampStars(result.metrics.starsEarned || 0);
            if (stars > fallback.raceStars) fallback.raceStars = stars;
          }
        }
        nextProgress = fallback;
      }

      saveLocalProgress(progressStorageKeyStr, nextProgress);
      emitProgressUpdated();
      return { progress: nextProgress, newlyUnlockedAchievements };
    },
  };
}

/**
 * Optional helper: keep presets stable when built inside a component (e.g. reading `searchParams`).
 */
export function useMultiplicationTableDefinitionV2(args: { backHref: string; exerciseId: string }) {
  const exerciseId = String(args.exerciseId || 'mul-table-1').trim();
  return useMemo(() => makeMultiplicationTableDefinition({ backHref: args.backHref, exerciseId }), [args.backHref, exerciseId]);
}

