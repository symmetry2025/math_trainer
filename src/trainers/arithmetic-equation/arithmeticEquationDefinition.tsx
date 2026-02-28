'use client';

import type { ArithmeticEquationLevel, ArithmeticEquationTrainerConfig } from '../../data/arithmeticEquationConfig';
import { getArithmeticEquationConfig, ARITHMETIC_EQUATION_CONFIGS } from '../../data/arithmeticEquationConfig';
import { emitProgressUpdated } from '../../lib/stars';
import { hydrateProgressFromDb, wasHydratedRecently } from '../../lib/progressHydration';
import { arithmeticDbTrainerId, arithmeticStorageKey } from '../../lib/trainerIds';
import type { PresetDefinition, SessionConfigBase, SessionResult, TrainerDefinition } from '../../trainerFlow';
import { MENTAL_MATH_OPPONENT_NAMES } from '../../data/mentalMathConfig';
import ArithmeticEquationSession from './ArithmeticEquationSession';
import { TrainerRecordProgressResponseDtoSchema, type NewlyUnlockedAchievementDto } from '@smmtry/shared';

export type ArithmeticEquationProgress = {
  'accuracy-choice': boolean;
  'accuracy-input': boolean;
  raceStars: number; // 0..3
};

export type ArithmeticEquationSessionConfig = SessionConfigBase & {
  level: Exclude<ArithmeticEquationLevel, 'speed'>;
  starLevel?: 2 | 3;
};

function defaultProgress(): ArithmeticEquationProgress {
  return { 'accuracy-choice': false, 'accuracy-input': false, raceStars: 0 };
}

function clampStars(v: unknown): 0 | 1 | 2 | 3 {
  const n = Math.floor(Number(v || 0));
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  return 3;
}

function normalizeProgress(p: any): ArithmeticEquationProgress {
  return {
    'accuracy-choice': !!p?.['accuracy-choice'],
    'accuracy-input': !!p?.['accuracy-input'],
    raceStars: clampStars(p?.raceStars),
  };
}

function loadLocalProgress(config: ArithmeticEquationTrainerConfig): ArithmeticEquationProgress {
  try {
    const raw = window.localStorage.getItem(arithmeticStorageKey(config.id));
    if (!raw) return defaultProgress();
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return defaultProgress();
  }
}

function saveLocalProgress(config: ArithmeticEquationTrainerConfig, p: ArithmeticEquationProgress) {
  try {
    window.localStorage.setItem(arithmeticStorageKey(config.id), JSON.stringify(p));
  } catch {
    // ignore
  }
}

function presetBase(level: ArithmeticEquationLevel): Pick<ArithmeticEquationSessionConfig, 'level'> {
  return { level: level as ArithmeticEquationSessionConfig['level'] };
}

function makePresets(config: ArithmeticEquationTrainerConfig): Array<PresetDefinition<ArithmeticEquationSessionConfig, ArithmeticEquationProgress>> {
  const problems = (lvl: ArithmeticEquationLevel) => config.levels[lvl].problems;
  return [
    {
      id: 'accuracy-choice',
      title: 'Тренировка',
      description: `Выбери правильный ответ • ${problems('accuracy-choice')} примеров`,
      defaultConfig: { presetId: 'accuracy-choice', ...presetBase('accuracy-choice') },
      successPolicy: { type: 'minAccuracy', min: 0.8 },
    },
    {
      id: 'accuracy-input',
      title: 'Точность',
      description: `Введи ответ • ${problems('accuracy-input')} примеров`,
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
}

export function makeArithmeticEquationDefinition(args: { trainerId: string; backHref: string }): TrainerDefinition<ArithmeticEquationProgress, ArithmeticEquationSessionConfig> {
  const config = getArithmeticEquationConfig(args.trainerId);
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
      let local = loadLocalProgress(config);
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
        <ArithmeticEquationSession
          config={config}
          level={level}
          starLevel={starLevel}
          setMetrics={setMetrics}
          onComplete={({ solved, correct, total, mistakes, timeSec, won }) => {
            void solved; // available for result screen; success policy uses correct/total/won
            const success = level === 'race' ? !!won : total > 0 ? correct >= total * 0.8 : false;
            const result: SessionResult = {
              success,
              metrics: { correct, solved, total, mistakes, timeSec, won },
            };
            onFinish(result);
          }}
        />
      );
    },

    recordResult: async ({ config: sessionConfig, result }) => {
      const prev = loadLocalProgress(config);
      const next: ArithmeticEquationProgress = { ...prev };

      const level = sessionConfig.level;
      if (level === 'accuracy-choice' && result.success) next['accuracy-choice'] = true;
      if (level === 'accuracy-input' && result.success) next['accuracy-input'] = true;
      if (level === 'race') {
        const star = clampStars(sessionConfig.starLevel ?? 2);
        if (!!result.metrics.won) next.raceStars = Math.max(next.raceStars, star);
      }

      saveLocalProgress(config, next);
      emitProgressUpdated();

      // Best effort server record (source of truth)
      let newlyUnlockedAchievements: NewlyUnlockedAchievementDto[] = [];
      try {
        const id = String(sessionConfig.presetId || '');
        const isRace = id.startsWith('race:');
        const starLevel = isRace ? (Number(id.split(':')[1] || 2) as 2 | 3) : undefined;

        const correct = Math.max(0, Math.floor(Number(result.metrics.correct || 0)));
        const total = Math.max(0, Math.floor(Number(result.metrics.total || 0)));
        const time = Math.max(0, Math.floor(Number(result.metrics.timeSec || 0)));
        const won = !!result.metrics.won;

        const res = await fetch('/api/progress/record', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({
            trainerId: dbTrainerId,
            attemptId: sessionConfig.attemptId,
            kind: 'mental',
            level: isRace ? 'race' : (level as any),
            total,
            correct,
            time,
            won,
            starLevel,
          }),
        });
        const json: any = await res.json().catch(() => null);
        const parsed = TrainerRecordProgressResponseDtoSchema.safeParse(json);
        if (parsed.success) newlyUnlockedAchievements = parsed.data.newlyUnlockedAchievements ?? [];
        const p = (parsed.success ? parsed.data.progress : json?.progress) as any;
        if (res.ok && p) {
          const server = normalizeProgress(p);
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

export function isArithmeticEquationExerciseId(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(ARITHMETIC_EQUATION_CONFIGS, id);
}

