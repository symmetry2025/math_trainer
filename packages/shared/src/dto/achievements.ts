import { z } from "zod";

export const AchievementKindSchema = z.enum(["counter", "boolean"]);
export type AchievementKind = z.infer<typeof AchievementKindSchema>;

export const AchievementItemDtoSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  iconKey: z.string().trim().min(1),
  kind: AchievementKindSchema,
  total: z.number().int().nonnegative().optional(),
  progress: z.number().int().nonnegative(),
  unlockedAt: z.string().datetime().nullable(),
});
export type AchievementItemDto = z.infer<typeof AchievementItemDtoSchema>;

export const AchievementsResponseDtoSchema = z.object({
  achievements: z.array(AchievementItemDtoSchema),
});
export type AchievementsResponseDto = z.infer<typeof AchievementsResponseDtoSchema>;

