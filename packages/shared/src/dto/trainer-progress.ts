import { z } from "zod";

/**
 * Trainer progress DTO for the standalone trainer product.
 *
 * Notes:
 * - We keep `trainerId` as a string (e.g. "column-addition", "mental-math-add-20", "multiplication-runner").
 * - `kind` is the backend classification used by /api/progress/record.
 * - `level` is a mode/preset id inside a trainer family.
 */

export const TrainerProgressKindSchema = z.enum(["column", "mental", "drill"]);
export type TrainerProgressKind = z.infer<typeof TrainerProgressKindSchema>;

const TrainerIdSchema = z.string().trim().min(1);
const AttemptIdSchema = z.string().trim().min(1);

export const TrainerRecordProgressRequestDtoSchema = z.discriminatedUnion("kind", [
  z.object({
    trainerId: TrainerIdSchema,
    attemptId: AttemptIdSchema.optional(),
    kind: z.literal("column"),
    level: z.enum(["accuracy", "speed", "race"]),
    total: z.number().int().nonnegative(),
    solved: z.number().int().nonnegative(),
    mistakes: z.number().int().nonnegative(),
    time: z.number().int().nonnegative(),
    success: z.boolean().optional(),
    stars: z.number().int().optional(),
    won: z.boolean().optional(),
  }),
  z.object({
    trainerId: TrainerIdSchema,
    attemptId: AttemptIdSchema.optional(),
    kind: z.literal("mental"),
    level: z.enum(["accuracy-choice", "accuracy-input", "speed", "race"]),
    total: z.number().int().nonnegative(),
    correct: z.number().int().nonnegative(),
    mistakes: z.number().int().optional(),
    time: z.number().int().nonnegative(),
    won: z.boolean().optional(),
    starLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  }),
  z.object({
    trainerId: TrainerIdSchema,
    attemptId: AttemptIdSchema.optional(),
    kind: z.literal("drill"),
    level: z.enum(["lvl1", "lvl2", "lvl3", "race"]),
    total: z.number().int().nonnegative(),
    correct: z.number().int().nonnegative(),
    mistakes: z.number().int().nonnegative().optional(),
    time: z.number().int().nonnegative(),
    won: z.boolean().optional(),
    starLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  }),
]);
export type TrainerRecordProgressRequestDto = z.infer<typeof TrainerRecordProgressRequestDtoSchema>;

export const NewlyUnlockedAchievementDtoSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  iconKey: z.string().trim().min(1),
  unlockedAt: z.string().trim().min(1), // ISO
});
export type NewlyUnlockedAchievementDto = z.infer<typeof NewlyUnlockedAchievementDtoSchema>;

export const TrainerProgressResponseDtoSchema = z.object({
  trainerId: TrainerIdSchema,
  progress: z.unknown().nullable(),
});
export type TrainerProgressResponseDto = z.infer<typeof TrainerProgressResponseDtoSchema>;

/**
 * Response of POST /api/progress/record
 * - `progress`: updated per-trainer unlock/stars state
 * - `newlyUnlockedAchievements`: achievements unlocked by THIS attempt
 * - `duplicate`: true if attemptId was already recorded (idempotency)
 */
export const TrainerRecordProgressResponseDtoSchema = z.object({
  trainerId: TrainerIdSchema,
  progress: z.unknown().nullable(),
  newlyUnlockedAchievements: z.array(NewlyUnlockedAchievementDtoSchema).default([]),
  duplicate: z.boolean().optional(),
});
export type TrainerRecordProgressResponseDto = z.infer<typeof TrainerRecordProgressResponseDtoSchema>;

