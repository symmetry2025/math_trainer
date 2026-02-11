import { z } from 'zod';

import { IsoDateTimeStringSchema } from '../ids';
import { ParentInviteStatusSchema } from './admin-parent-invites';

export const AdminCreateStudentInviteRequestDtoSchema = z.object({
  studentUserId: z.string().min(1),
  expiresAt: IsoDateTimeStringSchema.optional(),
});
export type AdminCreateStudentInviteRequestDto = z.infer<
  typeof AdminCreateStudentInviteRequestDtoSchema
>;

export const AdminStudentInviteDtoSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  status: ParentInviteStatusSchema,
  expiresAt: IsoDateTimeStringSchema.optional(),
  studentUserId: z.string().min(1),
});
export type AdminStudentInviteDto = z.infer<typeof AdminStudentInviteDtoSchema>;

export const AdminCreateStudentInviteResponseDtoSchema = AdminStudentInviteDtoSchema;
export type AdminCreateStudentInviteResponseDto = z.infer<
  typeof AdminCreateStudentInviteResponseDtoSchema
>;

export const AdminRevokeStudentInviteResponseDtoSchema = AdminStudentInviteDtoSchema;
export type AdminRevokeStudentInviteResponseDto = z.infer<
  typeof AdminRevokeStudentInviteResponseDtoSchema
>;

const AdminListStudentInvitesStatusQuerySchema = z
  .string()
  .transform((v) => v.toLowerCase())
  .pipe(ParentInviteStatusSchema);

export const AdminListStudentInvitesQueryDtoSchema = z.object({
  take: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().min(1).optional(),
  sort: z.enum(['createdAt_desc', 'expiresAt_asc']).optional(),
  status: AdminListStudentInvitesStatusQuerySchema.optional(),
  studentUserId: z.string().min(1).optional(),
});
export type AdminListStudentInvitesQueryDto = z.infer<
  typeof AdminListStudentInvitesQueryDtoSchema
>;

export const AdminListStudentInvitesResponseDtoSchema = z.object({
  invites: z.array(AdminStudentInviteDtoSchema),
  nextCursor: z.string().optional(),
});
export type AdminListStudentInvitesResponseDto = z.infer<
  typeof AdminListStudentInvitesResponseDtoSchema
>;

