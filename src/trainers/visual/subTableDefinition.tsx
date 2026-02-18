'use client';

import { TrainerRecordProgressResponseDtoSchema, type NewlyUnlockedAchievementDto } from '@smmtry/shared';

import type { PresetDefinition, SessionConfigBase, SessionResult, TrainerDefinition } from '../../trainerFlow';
import { emitProgressUpdated } from '../../lib/crystals';
import { hydrateProgressFromDb, wasHydratedRecently } from '../../lib/progressHydration';
import { arithmeticDbTrainerId, arithmeticStorageKey } from '../../lib/trainerIds';
import { getSubTableConfig, type SubTableKind } from '../../data/subTableConfig';
import { defaultVisualMentalProgress, normalizeVisualMentalProgress, type VisualMentalProgress } from './visualProgress';
import { SubTableSession } from './SubTableSession';

export type SubTableSessionConfig = SessionConfigBase & {
  level: 'accuracy-choice' | 'accuracy-input' | 'speed' | 'race';
  starLevel?: 1 | 2 | 3;
  timeLimitSec?: number;
  npcSecondsPerProblem?: number;
  kind: SubTableKind;
  columns: number;
  diffMin: number;
  diffMax: number;
  knownMin: number;
  knownMax: number;
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

function makePresets(cfg: {
  kind: SubTableKind;
  columns: number;
  diffMin: number;
  diffMax: number;
  knownMin: number;
  knownMax: number;
}): Array<PresetDefinition<SubTableSessionConfig, VisualMentalProgress>> {
  const base = (level: 'accuracy-choice' | 'accuracy-input') => ({
    presetId: level,
    level,
    kind: cfg.kind,
    columns: cfg.columns,
    diffMin: cfg.diffMin,
    diffMax: cfg.diffMax,
    knownMin: cfg.knownMin,
    knownMax: cfg.knownMax,
  });

  const label = `Заполни ${Math.max(1, cfg.columns)} колонок`;
  const speedLimitSec = Math.max(20, Math.min(120, Math.max(1, cfg.columns) * 6));
  const npcSeconds = { 1: 7, 2: 6, 3: 5 } as const;

  return [
    {
      id: 'accuracy-choice',
      title: 'Тренировка',
      description: label,
      defaultConfig: base('accuracy-choice'),
      successPolicy: { type: 'minAccuracy', min: 0.8 },
    },
    {
      id: 'accuracy-input',
      title: 'Точность',
      description: label,
      defaultConfig: base('accuracy-input'),
      successPolicy: { type: 'minAccuracy', min: 0.8 },
    },
    {
      id: 'speed',
      title: 'Скорость',
      description: `Успей за ${speedLimitSec} секунд • ${label}`,
      defaultConfig: {
        presetId: 'speed',
        level: 'speed',
        timeLimitSec: speedLimitSec,
        kind: cfg.kind,
        columns: cfg.columns,
        diffMin: cfg.diffMin,
        diffMax: cfg.diffMax,
        knownMin: cfg.knownMin,
        knownMax: cfg.knownMax,
      },
      successPolicy: { type: 'custom', eval: ({ metrics }) => !!metrics.won, label: 'Успей за время' },
    },
    {
      id: 'race:1',
      title: 'Новичок',
      description: `Заполни ${label.toLowerCase()} быстрее Новичка`,
      defaultConfig: {
        presetId: 'race:1',
        level: 'race',
        starLevel: 1,
        npcSecondsPerProblem: npcSeconds[1],
        kind: cfg.kind,
        columns: cfg.columns,
        diffMin: cfg.diffMin,
        diffMax: cfg.diffMax,
        knownMin: cfg.knownMin,
        knownMax: cfg.knownMax,
      },
      successPolicy: { type: 'custom', eval: ({ metrics }) => !!metrics.won, label: 'Обгони соперника' },
    },
    {
      id: 'race:2',
      title: 'Знаток',
      description: `Заполни ${label.toLowerCase()} быстрее Знатока`,
      defaultConfig: {
        presetId: 'race:2',
        level: 'race',
        starLevel: 2,
        npcSecondsPerProblem: npcSeconds[2],
        kind: cfg.kind,
        columns: cfg.columns,
        diffMin: cfg.diffMin,
        diffMax: cfg.diffMax,
        knownMin: cfg.knownMin,
        knownMax: cfg.knownMax,
      },
      successPolicy: { type: 'custom', eval: ({ metrics }) => !!metrics.won, label: 'Обгони соперника' },
    },
    {
      id: 'race:3',
      title: 'Мастер',
      description: `Заполни ${label.toLowerCase()} быстрее Мастера`,
      defaultConfig: {
        presetId: 'race:3',
        level: 'race',
        starLevel: 3,
        npcSecondsPerProblem: npcSeconds[3],
        kind: cfg.kind,
        columns: cfg.columns,
        diffMin: cfg.diffMin,
        diffMax: cfg.diffMax,
        knownMin: cfg.knownMin,
        knownMax: cfg.knownMax,
      },
      successPolicy: { type: 'custom', eval: ({ metrics }) => !!metrics.won, label: 'Обгони соперника' },
    },
  ];
}

export function makeSubTableDefinition(args: { trainerId: string; backHref: string }): TrainerDefinition<VisualMentalProgress, SubTableSessionConfig> {
  const cfg = getSubTableConfig(args.trainerId);
  const dbTrainerId = arithmeticDbTrainerId(cfg.id);
  const presets = makePresets({
    kind: cfg.kind,
    columns: cfg.columns,
    diffMin: cfg.diffMin,
    diffMax: cfg.diffMax,
    knownMin: cfg.knownMin,
    knownMax: cfg.knownMax,
  });

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
        if (presetId === 'speed') return !p?.['accuracy-input'];
        if (presetId === 'race:1') return !p?.speed;
        if (presetId === 'race:2') return !p?.speed || Number(p?.raceStars || 0) < 1;
        if (presetId === 'race:3') return !p?.speed || Number(p?.raceStars || 0) < 2;
        return false;
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
        <SubTableSession
          attemptId={config.attemptId}
          kind={config.kind}
          columns={config.columns}
          diffMin={config.diffMin}
          diffMax={config.diffMax}
          knownMin={config.knownMin}
          knownMax={config.knownMax}
          level={config.level}
          timeLimitSec={config.timeLimitSec}
          starLevel={config.starLevel}
          npcSecondsPerProblem={config.npcSecondsPerProblem}
          setMetrics={setMetrics}
          onFinish={({ correct, solved, total, mistakes, timeSec, won, starsEarned }) => {
            const level = config.level;
            const success = level === 'speed' || level === 'race' ? !!won : total > 0 ? correct >= total * 0.8 : false;
            const result: SessionResult = { success, metrics: { total, solved, correct, mistakes, timeSec, won: !!won, starsEarned } };
            onFinish(result);
          }}
        />
      );
    },

    recordResult: async ({ config, result }) => {
      const prev = loadLocalProgress(cfg.id);
      const next: VisualMentalProgress = { ...prev };

      if (config.level === 'accuracy-choice' && result.success) next['accuracy-choice'] = true;
      if (config.level === 'accuracy-input' && result.success) next['accuracy-input'] = true;
      if (config.level === 'speed' && !!result.metrics.won) next.speed = true;
      if (config.level === 'race') {
        const star = Math.max(1, Math.min(3, Math.floor(Number(config.starLevel || 1)))) as 1 | 2 | 3;
        if (!!result.metrics.won) next.raceStars = Math.max(next.raceStars, star);
      }

      saveLocalProgress(cfg.id, next);
      emitProgressUpdated();

      let newlyUnlockedAchievements: NewlyUnlockedAchievementDto[] = [];
      try {
        const presetId = String(config.presetId || '');
        const isRace = presetId.startsWith('race:') || config.level === 'race';
        const starLevel = isRace ? (Math.max(1, Math.min(3, Number(config.starLevel || presetId.split(':')[1] || 1))) as 1 | 2 | 3) : undefined;
        const level = isRace ? 'race' : config.level;
        const won = !!result.metrics.won;
        const total = Math.max(0, Math.floor(Number(result.metrics.total || 0)));
        const correct = Math.max(0, Math.floor(Number(result.metrics.correct || 0)));
        const mistakes = Math.max(0, Math.floor(Number(result.metrics.mistakes || 0)));
        const time = Math.max(0, Math.floor(Number(result.metrics.timeSec || 0)));

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
            opponent: isRace
              ? {
                  id: `npc:${starLevel}`,
                  name: 'Соперник',
                  title: 'NPC',
                }
              : null,
          }),
        });
        if (res.ok) {
          const body = TrainerRecordProgressResponseDtoSchema.safeParse(await res.json());
          if (body.success) newlyUnlockedAchievements = body.data.newlyUnlockedAchievements ?? [];
        }
      } catch {
        // ignore
      }

      return { progress: next, newlyUnlockedAchievements };
    },
  };
}

