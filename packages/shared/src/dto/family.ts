import { z } from 'zod';

import { IsoDateTimeStringSchema, UserIdSchema } from '../ids';

export const ParentInviteCodeSchema = z.string().min(4).max(32);

export const ParentInviteDtoSchema = z.object({
  code: ParentInviteCodeSchema,
  updatedAt: IsoDateTimeStringSchema,
});
export type ParentInviteDto = z.infer<typeof ParentInviteDtoSchema>;

export const StudentFamilyStatusDtoSchema = z.object({
  linkedParent: z
    .object({
      userId: UserIdSchema,
      displayName: z.string().min(1).nullable(),
      email: z.string().email().nullable(),
    })
    .nullable(),
  trialEndsAt: IsoDateTimeStringSchema.nullable(),
});
export type StudentFamilyStatusDto = z.infer<typeof StudentFamilyStatusDtoSchema>;

export const ParentChildStatsDtoSchema = z.object({
  totalProblems: z.number().int().min(0),
  totalCorrect: z.number().int().min(0),
  totalMistakes: z.number().int().min(0),
  totalTimeSec: z.number().int().min(0),
  sessionsCount: z.number().int().min(0),
});
export type ParentChildStatsDto = z.infer<typeof ParentChildStatsDtoSchema>;

export const ParentChildListItemDtoSchema = z.object({
  userId: UserIdSchema,
  displayName: z.string().min(1).nullable(),
  email: z.string().email().nullable(),
  linkedAt: IsoDateTimeStringSchema,
  trialEndsAt: IsoDateTimeStringSchema.nullable(),
  stats: ParentChildStatsDtoSchema.nullable(),
});
export type ParentChildListItemDto = z.infer<typeof ParentChildListItemDtoSchema>;

export const ParentChildrenResponseDtoSchema = z.object({
  children: z.array(ParentChildListItemDtoSchema),
});
export type ParentChildrenResponseDto = z.infer<typeof ParentChildrenResponseDtoSchema>;

export const StudentLinkParentRequestDtoSchema = z.object({
  code: ParentInviteCodeSchema,
});
export type StudentLinkParentRequestDto = z.infer<typeof StudentLinkParentRequestDtoSchema>;

export const StudentLinkParentResponseDtoSchema = z.object({
  ok: z.literal(true),
});
export type StudentLinkParentResponseDto = z.infer<typeof StudentLinkParentResponseDtoSchema>;

export const SetRoleRequestDtoSchema = z.object({
  role: z.enum(['parent', 'student']),
});
export type SetRoleRequestDto = z.infer<typeof SetRoleRequestDtoSchema>;

export const SetRoleResponseDtoSchema = z.object({
  ok: z.literal(true),
  redirectTo: z.string().min(1),
});
export type SetRoleResponseDto = z.infer<typeof SetRoleResponseDtoSchema>;

