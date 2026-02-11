import { z } from 'zod';

import { IsoDateTimeStringSchema } from '../ids';
import { ParentInviteStatusSchema } from './admin-parent-invites';

export const AdminCreateTeacherInviteRequestDtoSchema = z.object({
  teacherUserId: z.string().min(1),
  expiresAt: IsoDateTimeStringSchema.optional(),
});
export type AdminCreateTeacherInviteRequestDto = z.infer<
  typeof AdminCreateTeacherInviteRequestDtoSchema
>;

export const AdminTeacherInviteDtoSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  status: ParentInviteStatusSchema,
  expiresAt: IsoDateTimeStringSchema.optional(),
  teacherUserId: z.string().min(1),
});
export type AdminTeacherInviteDto = z.infer<typeof AdminTeacherInviteDtoSchema>;

export const AdminCreateTeacherInviteResponseDtoSchema = AdminTeacherInviteDtoSchema;
export type AdminCreateTeacherInviteResponseDto = z.infer<
  typeof AdminCreateTeacherInviteResponseDtoSchema
>;

export const AdminRevokeTeacherInviteResponseDtoSchema = AdminTeacherInviteDtoSchema;
export type AdminRevokeTeacherInviteResponseDto = z.infer<
  typeof AdminRevokeTeacherInviteResponseDtoSchema
>;

const AdminListTeacherInvitesStatusQuerySchema = z
  .string()
  .transform((v) => v.toLowerCase())
  .pipe(ParentInviteStatusSchema);

export const AdminListTeacherInvitesQueryDtoSchema = z.object({
  take: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().min(1).optional(),
  sort: z.enum(['createdAt_desc', 'expiresAt_asc']).optional(),
  status: AdminListTeacherInvitesStatusQuerySchema.optional(),
  teacherUserId: z.string().min(1).optional(),
});
export type AdminListTeacherInvitesQueryDto = z.infer<
  typeof AdminListTeacherInvitesQueryDtoSchema
>;

export const AdminListTeacherInvitesResponseDtoSchema = z.object({
  invites: z.array(AdminTeacherInviteDtoSchema),
  nextCursor: z.string().optional(),
});
export type AdminListTeacherInvitesResponseDto = z.infer<
  typeof AdminListTeacherInvitesResponseDtoSchema
>;

