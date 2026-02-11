import { z } from "zod";

export const DailyChallengeDtoSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  rewardCrystals: z.number().int().nonnegative(),
  progress: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  timeLimitLabel: z.string().trim().min(1),
  difficultyLabel: z.string().trim().min(1),
  startHref: z.string().trim().min(1),
});
export type DailyChallengeDto = z.infer<typeof DailyChallengeDtoSchema>;

export const ChallengeStreakDtoSchema = z.object({
  streakDays: z.number().int().nonnegative(),
  nextMilestoneDays: z.number().int().positive(),
  milestoneRewardCrystals: z.number().int().nonnegative(),
});
export type ChallengeStreakDto = z.infer<typeof ChallengeStreakDtoSchema>;

export const ChallengeTodayResponseDtoSchema = z.object({
  today: DailyChallengeDtoSchema,
  streak: ChallengeStreakDtoSchema,
});
export type ChallengeTodayResponseDto = z.infer<typeof ChallengeTodayResponseDtoSchema>;

