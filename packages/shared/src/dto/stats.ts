import { z } from "zod";

export const StatsWeekDayDtoSchema = z.object({
  /** YYYY-MM-DD (UTC) */
  date: z.string().trim().min(10),
  /** Short RU label like "Пн" */
  label: z.string().trim().min(1),
  successSessions: z.number().int().nonnegative(),
});
export type StatsWeekDayDto = z.infer<typeof StatsWeekDayDtoSchema>;

export const StatsSummaryDtoSchema = z.object({
  totalProblems: z.number().int().nonnegative(),
  totalCorrect: z.number().int().nonnegative(),
  totalMistakes: z.number().int().nonnegative(),
  totalTimeSec: z.number().int().nonnegative(),
  sessionsCount: z.number().int().nonnegative(),
  perfectSessionsCount: z.number().int().nonnegative(),
  raceWinsCount: z.number().int().nonnegative(),
  accuracyPct: z.number().min(0).max(100),
  week: z.array(StatsWeekDayDtoSchema),
});
export type StatsSummaryDto = z.infer<typeof StatsSummaryDtoSchema>;

