import type {
  AchievementDef,
  AchievementId,
  AchievementState,
  AttemptFacts,
  NewlyUnlockedAchievement,
  UserStatsDelta,
  UserStatsSnapshot,
} from './types';

function asInt(x: unknown, def = 0) {
  const n = typeof x === 'number' ? x : typeof x === 'string' ? Number(x) : NaN;
  return Number.isFinite(n) ? Math.floor(n) : def;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function nowIso() {
  return new Date().toISOString();
}

export function computeStatsDeltaFromAttempt(attempt: AttemptFacts): UserStatsDelta {
  const total = Math.max(0, asInt(attempt.total, 0));
  const correct = clamp(asInt(attempt.correct, 0), 0, total || Number.MAX_SAFE_INTEGER);
  const mistakesKnown = attempt.mistakes !== undefined && attempt.mistakes !== null;
  const mistakes = mistakesKnown ? Math.max(0, asInt(attempt.mistakes, 0)) : 0;
  const timeSec = Math.max(0, asInt(attempt.timeSec, 0));
  const won = !!attempt.won;

  const isRace = attempt.level === 'race' || String(attempt.level).startsWith('race');
  const isPerfect = total > 0 && mistakesKnown && mistakes === 0;

  return {
    totalProblems: total,
    totalCorrect: correct,
    totalMistakes: mistakes,
    totalTimeSec: timeSec,
    sessionsCount: 1,
    perfectSessionsCount: isPerfect ? 1 : 0,
    raceWinsCount: isRace && won ? 1 : 0,
  };
}

export function applyStatsDelta(prev: UserStatsSnapshot, delta: UserStatsDelta): UserStatsSnapshot {
  return {
    totalProblems: prev.totalProblems + Math.max(0, asInt(delta.totalProblems, 0)),
    totalCorrect: prev.totalCorrect + Math.max(0, asInt(delta.totalCorrect, 0)),
    totalMistakes: prev.totalMistakes + Math.max(0, asInt(delta.totalMistakes, 0)),
    totalTimeSec: prev.totalTimeSec + Math.max(0, asInt(delta.totalTimeSec, 0)),
    sessionsCount: prev.sessionsCount + Math.max(0, asInt(delta.sessionsCount, 0)),
    perfectSessionsCount: prev.perfectSessionsCount + Math.max(0, asInt(delta.perfectSessionsCount, 0)),
    raceWinsCount: prev.raceWinsCount + Math.max(0, asInt(delta.raceWinsCount, 0)),
  };
}

function stateById(states: AchievementState[] | Record<string, AchievementState> | null | undefined): Record<string, AchievementState> {
  if (!states) return {};
  if (!Array.isArray(states)) return states;
  const map: Record<string, AchievementState> = {};
  for (const s of states) map[s.id] = s;
  return map;
}

export function evaluateAchievements(args: {
  catalog: AchievementDef[];
  prevStates: AchievementState[] | Record<string, AchievementState> | null | undefined;
  prevStats: UserStatsSnapshot;
  nextStats: UserStatsSnapshot;
}): {
  nextStates: Record<AchievementId, AchievementState>;
  newlyUnlocked: NewlyUnlockedAchievement[];
} {
  const prev = stateById(args.prevStates);
  const out: Record<string, AchievementState> = { ...prev };
  const newly: NewlyUnlockedAchievement[] = [];

  for (const def of args.catalog) {
    const prevState = prev[def.id] ?? { id: def.id, progress: 0, unlockedAt: null };
    if (prevState.unlockedAt) {
      out[def.id] = prevState;
      continue;
    }

    if (def.kind === 'counter') {
      const total = Math.max(1, asInt(def.total, 1));
      let value = prevState.progress;

      // Map achievement to a stats signal.
      // Expand later as we add more achievements.
      if (def.id === 'first-10-problems' || def.id === 'first-100-problems') value = args.nextStats.totalProblems;
      else if (def.id === 'race-master') value = args.nextStats.raceWinsCount;
      else if (def.id === 'time-hero') value = args.nextStats.totalTimeSec;
      else value = Math.max(prevState.progress, args.nextStats.totalProblems);

      const nextProgress = clamp(asInt(value, 0), 0, total);
      const unlocked = nextProgress >= total;
      const unlockedAt = unlocked ? nowIso() : null;
      const nextState: AchievementState = { id: def.id, progress: nextProgress, unlockedAt };
      out[def.id] = nextState;
      if (unlockedAt) newly.push({ id: def.id, title: def.title, description: def.description, iconKey: def.iconKey, unlockedAt });
      continue;
    }

    // boolean
    let unlocked = false;
    if (def.id === 'perfect-session') {
      unlocked = args.nextStats.perfectSessionsCount > args.prevStats.perfectSessionsCount;
    } else if (def.id === 'first-race-win') {
      unlocked = args.nextStats.raceWinsCount > args.prevStats.raceWinsCount;
    }

    const unlockedAt = unlocked ? nowIso() : null;
    const nextState: AchievementState = { id: def.id, progress: unlocked ? 1 : 0, unlockedAt };
    out[def.id] = nextState;
    if (unlockedAt) newly.push({ id: def.id, title: def.title, description: def.description, iconKey: def.iconKey, unlockedAt });
  }

  return { nextStates: out, newlyUnlocked: newly };
}

