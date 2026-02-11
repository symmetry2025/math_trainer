export type AchievementId = string;

/**
 * Compact, backend-friendly icon key.
 * UI maps this key to an icon component.
 */
export type AchievementIconKey =
  | 'star'
  | 'zap'
  | 'target'
  | 'trophy'
  | 'crown'
  | 'flame'
  | 'medal'
  | 'gem'
  | 'swords'
  | (string & {});

export type AchievementDef = {
  id: AchievementId;
  title: string;
  description: string;
  iconKey: AchievementIconKey;
  /**
   * Simple progress model.
   * - counter: progresses towards a total
   * - boolean: unlocked once condition becomes true
   */
  kind: 'counter' | 'boolean';
  total?: number; // required for counter
};

export type AchievementState = {
  id: AchievementId;
  progress: number;
  unlockedAt: string | null; // ISO
};

export type NewlyUnlockedAchievement = {
  id: AchievementId;
  title: string;
  description: string;
  iconKey: AchievementIconKey;
  unlockedAt: string; // ISO
};

export type AttemptFacts = {
  trainerId: string;
  kind: 'column' | 'mental' | 'arithmetic' | (string & {});
  level: string;
  correct?: number;
  total?: number;
  mistakes?: number;
  timeSec?: number;
  won?: boolean;
  starLevel?: 1 | 2 | 3;
  // Extend later as needed.
};

export type UserStatsSnapshot = {
  totalProblems: number;
  totalCorrect: number;
  totalMistakes: number;
  totalTimeSec: number;
  sessionsCount: number;
  perfectSessionsCount: number;
  raceWinsCount: number;
};

export type UserStatsDelta = Partial<UserStatsSnapshot>;

