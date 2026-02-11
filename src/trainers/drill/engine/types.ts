export type DrillAnswerStatus = 'correct' | 'wrong' | null;

type DrillTimerMode = 'elapsed' | 'remaining';

export type DrillTimerConfig =
  | { mode: 'elapsed' }
  | {
      mode: 'remaining';
      totalSeconds: number;
      /**
       * If true, the engine will finish the run when time reaches 0.
       * Useful for Speed. For Race, keep it false (time is informative).
       */
      endOnZero?: boolean;
    };

export type DrillAttemptPolicy = 'single' | 'untilCorrect';

export type DrillEngineResult = {
  correct: number;
  /** Number of problems attempted/advanced (may differ from `correct` in single-attempt modes). */
  solved: number;
  total: number;
  mistakes: number;
  timeSec: number;
  /** For speed/race presets: whether the user "won" by policy */
  won?: boolean;
};

