'use client';

import type { MentalMathLevel, MentalMathTrainerConfig } from '../../data/mentalMathConfig';
import { getMentalMathConfig, MENTAL_MATH_OPPONENT_NAMES } from '../../data/mentalMathConfig';
import MentalMathSession from './MentalMathSession';
import { emitProgressUpdated } from '../../lib/stars';
import { hydrateProgressFromDb, wasHydratedRecently } from '../../lib/progressHydration';
import { arithmeticDbTrainerId, arithmeticStorageKey } from '../../lib/trainerIds';
import type { PresetDefinition, SessionConfigBase, SessionResult, TrainerDefinition } from '../../trainerFlow';
import { TrainerRecordProgressResponseDtoSchema, type NewlyUnlockedAchievementDto } from '@smmtry/shared';

export type MentalMathProgress = {
  'accuracy-choice': boolean;
  'accuracy-input': boolean;
  raceStars: number; // 0..3
};

export type MentalMathSessionConfig = SessionConfigBase & {
  level: Exclude<MentalMathLevel, 'speed'>;
  starLevel?: 2 | 3;
};

function defaultProgress(): MentalMathProgress {
  return { 'accuracy-choice': false, 'accuracy-input': false, raceStars: 0 };
}

function clampStars(v: unknown): 0 | 1 | 2 | 3 {
  const n = Math.floor(Number(v || 0));
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  return 3;
}

function normalizeProgress(p: any): MentalMathProgress {
  return {
    'accuracy-choice': !!p?.['accuracy-choice'],
    'accuracy-input': !!p?.['accuracy-input'],
    raceStars: clampStars(p?.raceStars),
  };
}

function loadLocalProgress(config: MentalMathTrainerConfig): MentalMathProgress {
  try {
    const raw = window.localStorage.getItem(arithmeticStorageKey(config.id));
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw);
    return normalizeProgress(parsed);
  } catch {
    return defaultProgress();
  }
}

function saveLocalProgress(config: MentalMathTrainerConfig, p: MentalMathProgress) {
  try {
    window.localStorage.setItem(arithmeticStorageKey(config.id), JSON.stringify(p));
  } catch {
    // ignore
  }
}

function presetBase(level: MentalMathLevel): Pick<MentalMathSessionConfig, 'level'> {
  return { level: level as MentalMathSessionConfig['level'] };
}

function makePresets(config: MentalMathTrainerConfig): Array<PresetDefinition<MentalMathSessionConfig, MentalMathProgress>> {
  const problems = (lvl: MentalMathLevel) => config.levels[lvl].problems;

  const presets: Array<PresetDefinition<MentalMathSessionConfig, MentalMathProgress>> = [
    {
      id: 'accuracy-choice',
      title: 'Тренировка',
      description: `Выбери правильный ответ из вариантов • ${problems('accuracy-choice')} примеров`,
      defaultConfig: { presetId: 'accuracy-choice', ...presetBase('accuracy-choice') },
      successPolicy: { type: 'minAccuracy', min: 0.8 },
    },
    {
      id: 'accuracy-input',
      title: 'Точность',
      description: `Введи ответ с клавиатуры • ${problems('accuracy-input')} примеров`,
      defaultConfig: { presetId: 'accuracy-input', ...presetBase('accuracy-input') },
      successPolicy: { type: 'minAccuracy', min: 0.8 },
    },
    {
      id: 'race:2',
      title: 'Знаток',
      description: `Реши ${problems('race')} примеров быстрее Знатока`,
      defaultConfig: { presetId: 'race:2', level: 'race', starLevel: 2 },
      successPolicy: { type: 'custom', eval: ({ metrics }) => !!metrics.won, label: 'Обгони противника' },
    },
    {
      id: 'race:3',
      title: 'Мастер',
      description: `Реши ${problems('race')} примеров быстрее Мастера`,
      defaultConfig: { presetId: 'race:3', level: 'race', starLevel: 3 },
      successPolicy: { type: 'custom', eval: ({ metrics }) => !!metrics.won, label: 'Обгони противника' },
    },
  ];

  return presets;
}

function computeSuccess(level: MentalMathLevel, args: { correct: number; total: number; won?: boolean }): boolean {
  if (level === 'race') return !!args.won;
  // accuracy modes
  return args.total > 0 ? args.correct >= args.total * 0.8 : false;
}

export function makeMentalMathDefinition(args: { trainerId: string; backHref: string }): TrainerDefinition<MentalMathProgress, MentalMathSessionConfig> {
  const config = getMentalMathConfig(args.trainerId);
  const dbTrainerId = arithmeticDbTrainerId(config.id);
  const presets = makePresets(config);

  return {
    meta: {
      id: dbTrainerId,
      slug: `arithmetic/${config.id}`,
      title: config.name,
      backHref: args.backHref,
      archetype: 'mental',
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
      // Load local fast path.
      let local = loadLocalProgress(config);

      // Hydrate from DB (source of truth) with TTL, to avoid flicker and double requests.
      try {
        if (!wasHydratedRecently(dbTrainerId, 60_000)) {
          const did = await hydrateProgressFromDb(dbTrainerId);
          if (did) {
            local = loadLocalProgress(config);
            emitProgressUpdated();
          }
        }
      } catch {
        // ignore
      }

      return local;
    },

    renderSession: ({ config: sessionConfig, onFinish, onBackToSelect, setMetrics }) => {
      const level = sessionConfig.level;
      const starLevel = sessionConfig.level === 'race' ? (sessionConfig.starLevel ?? 2) : undefined;
      return (
        <MentalMathSession
          config={config}
          level={level}
          starLevel={starLevel}
          setMetrics={setMetrics}
          onComplete={({ solved, correct, total, mistakes, timeSec, won }) => {
            void solved; // available for result screen; success policy uses correct/total/won
            const success = computeSuccess(level, { correct, total, won });
            const result: SessionResult = {
              success,
              metrics: {
                total,
                solved,
                correct,
                mistakes,
                timeSec,
                won: !!won,
                starsEarned: level === 'race' && success ? (starLevel ?? 2) : undefined,
              },
            };
            onFinish(result);
          }}
        />
      );
    },

    recordResult: async ({ config: sessionConfig, result }) => {
      // Update local progress immediately for instant unlock UX.
      const prev = loadLocalProgress(config);
      const next: MentalMathProgress = { ...prev };

      const level = sessionConfig.level;
      const correct = Math.floor(Number(result.metrics.correct || 0));
      const total = Math.max(0, Math.floor(Number(result.metrics.total || 0)));
      const won = !!result.metrics.won;

      if (level === 'accuracy-choice' && total > 0 && correct >= total * 0.8) next['accuracy-choice'] = true;
      else if (level === 'accuracy-input' && total > 0 && correct >= total * 0.8) next['accuracy-input'] = true;
      else if (level === 'race' && won) next.raceStars = Math.max(next.raceStars, sessionConfig.starLevel ?? 2);

      saveLocalProgress(config, next);
      emitProgressUpdated();

      // Server-side record (best effort).
      let newlyUnlockedAchievements: NewlyUnlockedAchievementDto[] = [];
      try {
        const res = await fetch('/api/progress/record', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({
            trainerId: dbTrainerId,
            attemptId: sessionConfig.attemptId,
            kind: 'mental',
            level,
            total,
            correct,
            time: Math.floor(Number(result.metrics.timeSec || 0)),
            won,
            starLevel: level === 'race' ? (sessionConfig.starLevel ?? 2) : undefined,
          }),
        });
        const json: any = await res.json().catch(() => null);
        const parsed = TrainerRecordProgressResponseDtoSchema.safeParse(json);
        if (parsed.success) {
          newlyUnlockedAchievements = parsed.data.newlyUnlockedAchievements ?? [];
        }
        const p = (parsed.success ? parsed.data.progress : json?.progress) as any;
        if (p) {
          const server = normalizeProgress(p as any);
          saveLocalProgress(config, server);
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

