import type { AchievementDef } from './types';

/**
 * ACHIEVEMENTS CATALOG
 *
 * IMPORTANT:
 * - This is a stable contract: do NOT change ids once shipped.
 * - Titles/descriptions can be edited freely.
 *
 * Design goals:
 * - Achievements are computed incrementally (no history scans).
 * - Keep definitions small and deterministic.
 */
export const ACHIEVEMENT_CATALOG: AchievementDef[] = [
  {
    id: 'first-10-problems',
    title: 'Первые шаги',
    description: 'Реши 10 примеров',
    iconKey: 'star',
    kind: 'counter',
    total: 10,
  },
  {
    id: 'first-100-problems',
    title: 'Разогрев',
    description: 'Реши 100 примеров',
    iconKey: 'medal',
    kind: 'counter',
    total: 100,
  },
  {
    id: 'perfect-session',
    title: 'Безупречная сессия',
    description: 'Пройди сессию без ошибок',
    iconKey: 'target',
    kind: 'boolean',
  },
  {
    id: 'first-race-win',
    title: 'Первая победа',
    description: 'Выиграй гонку хотя бы один раз',
    iconKey: 'swords',
    kind: 'boolean',
  },
  {
    id: 'race-master',
    title: 'Гроза соперников',
    description: 'Выиграй 10 гонок',
    iconKey: 'crown',
    kind: 'counter',
    total: 10,
  },
  {
    id: 'time-hero',
    title: 'Скоростной герой',
    description: 'Набери 10 минут тренировок суммарно',
    iconKey: 'zap',
    kind: 'counter',
    total: 600, // seconds
  },
];

