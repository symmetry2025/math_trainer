import type { ReactNode } from 'react';

import type { NewlyUnlockedAchievementDto } from '@smmtry/shared';

/**
 * TrainerFlow — единый каноничный пайплайн: preset select (+ optional advanced) → session → result.
 *
 * IMPORTANT: Backend `kind` (например, 'mental'|'column') — отдельная классификация и
 * НЕ обязана быть 1:1 с archetype на первом этапе миграции.
 */

type TrainerArchetype = 'mental' | 'visual' | 'drill' | 'column';

/**
 * Конвенция для идентификаторов пресетов:
 * - простые: 'accuracy' | 'speed'
 * - параметризованные: 'race:1' | 'race:2' | 'race:3'
 * - допускается расширение: 'practice:choice', 'training:ordered' и т.п.
 */
export type PresetId = string;

export type TrainerMeta = {
  /** Stable id for DB/localStorage mapping (e.g. 'column-addition', 'arithmetic:add-10', 'arithmetic:mul-table-3') */
  id: string;
  /** Route slug (informational) */
  slug: string;
  title: string;
  backHref: string;
  archetype: TrainerArchetype;
};

export type HelperConfig = {
  enabled: boolean;
  type: 'table' | 'numbers' | (string & {});
  /** Arbitrary helper settings (strictly client-side) */
  params?: Record<string, unknown>;
};

export type SuccessPolicy =
  | { type: 'noMistakes' }
  | { type: 'minAccuracy'; min: number } // 0..1
  | { type: 'allOf'; policies: SuccessPolicy[] }
  | { type: 'anyOf'; policies: SuccessPolicy[] }
  | { type: 'custom'; eval: (args: { metrics: SessionMetrics }) => boolean; label?: string };

/**
 * UnlockPolicy describes how presets can be locked/unlocked.
 * NOTE: actual unlock logic is implemented in TRN-012; this is only the contract.
 */
export type UnlockPolicy<TProgress> =
  | { type: 'none' } // all unlocked
  | {
      type: 'linear';
      /**
       * Preset progression order.
       * If omitted/empty, order defaults to the `presets` array order.
       */
      order?: PresetId[];
      /**
       * Decide whether a given preset is considered "completed" based on aggregated progress.
       * This is required for linear gating to work across different progress shapes.
       */
      isCompleted: (args: { presetId: PresetId; progress: TProgress }) => boolean;
      /**
       * Optional custom reason text when preset is locked because a prerequisite is not completed.
       * If omitted, TrainerFlow will generate a default reason based on the first missing prerequisite title.
       */
      lockedReason?: (args: { presetId: PresetId; missingPresetId: PresetId; progress: TProgress }) => string | null;
    }
  | {
      type: 'custom';
      isLocked: (args: { presetId: PresetId; progress: TProgress }) => boolean;
      lockedReason?: (args: { presetId: PresetId; progress: TProgress }) => string | null;
    };

export type PresetUnlock<TProgress> = {
  /**
   * Optional explicit prerequisites. How to interpret them (linear/custom) is governed by UnlockPolicy.
   * For simple linear flows, prefer UnlockPolicy.linear; for per-preset rules, use UnlockPolicy.custom.
   */
  requires?: PresetId[];
  /** Additional lock condition beyond prerequisites */
  isLocked?: (args: { progress: TProgress }) => boolean;
  lockedReason?: (args: { progress: TProgress }) => string | null;
};

export type MetricBadge =
  | { kind: 'counter'; label: string; current: number; total: number }
  | { kind: 'time'; label: string; seconds: number; mode?: 'elapsed' | 'remaining'; totalSeconds?: number }
  | { kind: 'mistakes'; label: string; value: number }
  | { kind: 'stars'; label?: string; value: 0 | 1 | 2 | 3 }
  | { kind: 'text'; label: string; value: string };

export type SessionMetrics = {
  /**
   * Overall progress for the top progress bar.
   * Convention: 0..100 inclusive.
   */
  progressPct?: number;
  /** Optional opponent progress (race mode). 0..100 */
  opponentProgressPct?: number;
  /**
   * Canonical badges for the header. Keep the set minimal and reusable.
   * This powers TrainerGameFrame header rendering.
   */
  badges?: MetricBadge[];
  /**
   * Optional raw counters used by analytics/result screen.
   * These are NOT tied to a specific archetype.
   */
  total?: number;
  solved?: number;
  correct?: number;
  mistakes?: number;
  timeSec?: number;
  starsEarned?: 0 | 1 | 2 | 3;
  won?: boolean;
};

export type SessionResult = {
  success: boolean;
  metrics: SessionMetrics;
};

export type SessionConfigBase = {
  presetId: PresetId;
  /** optional, for TRN-014 idempotency */
  attemptId?: string;
};

export type PresetDefinition<TConfig extends SessionConfigBase, TProgress> = {
  id: PresetId;
  title: string;
  description?: string;
  helper?: HelperConfig;
  successPolicy?: SuccessPolicy;
  unlock?: PresetUnlock<TProgress>;
  /**
   * Default config for this preset (used when starting without Advanced overrides).
   * Keep this deterministic — it is part of idempotent retry.
   */
  defaultConfig: TConfig;
};

export type AdvancedDefinition<TConfig extends SessionConfigBase, TProgress> = {
  /** whether Advanced UI is available for a given preset */
  isAvailable?: (args: { presetId: PresetId; progress: TProgress }) => boolean;
  /** render advanced form */
  render: (args: {
    presetId: PresetId;
    progress: TProgress;
    config: TConfig;
    setConfig: (next: TConfig) => void;
  }) => ReactNode;
};

export type RenderSessionArgs<TConfig extends SessionConfigBase> = {
  config: TConfig;
  onFinish: (result: SessionResult) => void;
  onBackToSelect: () => void;
  /**
   * Optional channel for live session UI metrics (progress/badges) to render a canonical session frame.
   * If not used, session can render its own chrome.
   */
  setMetrics?: (metrics: SessionMetrics) => void;
};

export type RecordResultArgs<TConfig extends SessionConfigBase, TProgress> = {
  config: TConfig;
  result: SessionResult;
  prevProgress: TProgress;
};

export type RecordResultOutcome<TProgress> = {
  progress: TProgress;
  newlyUnlockedAchievements?: NewlyUnlockedAchievementDto[];
};

export type TrainerDefinition<TProgress, TConfig extends SessionConfigBase> = {
  meta: TrainerMeta;

  /** Hydrate/load progress in entry step (client only). */
  loadProgress: () => Promise<TProgress>;

  /** Presets ("levels") presented to the user. */
  presets: Array<PresetDefinition<TConfig, TProgress>>;

  /** Unlock behavior for presets. Default: {type:'none'} */
  unlockPolicy?: UnlockPolicy<TProgress>;

  /** Optional advanced configuration UI. */
  advanced?: AdvancedDefinition<TConfig, TProgress>;

  /** Render the actual training session UI for this trainer. */
  renderSession: (args: RenderSessionArgs<TConfig>) => ReactNode;

  /**
   * If provided, TrainerFlow wraps the session with canonical TrainerGameFrame chrome,
   * using live metrics from setMetrics.
   */
  sessionFrame?: { type: 'trainerGameFrame' };

  /**
   * Persist the result (localStorage and/or server) and return updated progress.
   * Must be monotonic: never regress progress.
   */
  recordResult: (args: RecordResultArgs<TConfig, TProgress>) => Promise<RecordResultOutcome<TProgress>>;
};

