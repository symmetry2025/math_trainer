import { z } from 'zod';

import { IsoDateTimeStringSchema } from '../ids';

export const ParentInviteStatusSchema = z.enum(['active', 'used', 'expired', 'revoked']);
export type ParentInviteStatus = z.infer<typeof ParentInviteStatusSchema>;

export const AdminCreateParentInviteRequestDtoSchema = z.object({
  parentProfileId: z.string().min(1),
  expiresAt: IsoDateTimeStringSchema.optional(),
});
export type AdminCreateParentInviteRequestDto = z.infer<
  typeof AdminCreateParentInviteRequestDtoSchema
>;

export const AdminParentInviteDtoSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  status: ParentInviteStatusSchema,
  expiresAt: IsoDateTimeStringSchema.optional(),
  parentProfileId: z.string().min(1),
  branchId: z.string().min(1),
});
export type AdminParentInviteDto = z.infer<typeof AdminParentInviteDtoSchema>;

export const AdminCreateParentInviteResponseDtoSchema = AdminParentInviteDtoSchema;
export type AdminCreateParentInviteResponseDto = z.infer<
  typeof AdminCreateParentInviteResponseDtoSchema
>;

export const AdminRevokeParentInviteResponseDtoSchema = AdminParentInviteDtoSchema;
export type AdminRevokeParentInviteResponseDto = z.infer<
  typeof AdminRevokeParentInviteResponseDtoSchema
>;

// --- Admin: Parent invites (list) ---

const AdminListParentInvitesStatusQuerySchema = z
  .string()
  .transform((v) => v.toLowerCase())
  .pipe(ParentInviteStatusSchema);

export const AdminListParentInvitesQueryDtoSchema = z.object({
  take: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().min(1).optional(),
  sort: z.enum(['createdAt_desc', 'expiresAt_asc']).optional(),
  // Accept both `active` and `ACTIVE` for convenience.
  status: AdminListParentInvitesStatusQuerySchema.optional(),
});
export type AdminListParentInvitesQueryDto = z.infer<typeof AdminListParentInvitesQueryDtoSchema>;

export const AdminListParentInvitesResponseDtoSchema = z.object({
  invites: z.array(AdminParentInviteDtoSchema),
  nextCursor: z.string().optional(),
});
export type AdminListParentInvitesResponseDto = z.infer<
  typeof AdminListParentInvitesResponseDtoSchema
>;

// --- Admin: Parent profiles (list) ---

export const AdminParentProfileListItemDtoSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1).optional(),
  branchId: z.string().min(1),
  userId: z.string().min(1).optional(),
  userEmail: z.string().email().optional(),
});
export type AdminParentProfileListItemDto = z.infer<typeof AdminParentProfileListItemDtoSchema>;

export const AdminListParentsResponseDtoSchema = z.object({
  parents: z.array(AdminParentProfileListItemDtoSchema),
  nextCursor: z.string().min(1).optional(),
});
export type AdminListParentsResponseDto = z.infer<typeof AdminListParentsResponseDtoSchema>;

export const AdminListParentsQueryDtoSchema = z.object({
  take: z.coerce.number().int().min(1).max(500).optional(),
  cursor: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
});
export type AdminListParentsQueryDto = z.infer<typeof AdminListParentsQueryDtoSchema>;

// --- Admin: Teacher / Student lists (derived from User + UserProfile) ---

export const AdminTeacherProfileListItemDtoSchema = z.object({
  userId: z.string().min(1),
  userEmail: z.string().email(),
  displayName: z.string().min(1).optional(),
  alfaExternalId: z.string().min(1).optional(),
});
export type AdminTeacherProfileListItemDto = z.infer<typeof AdminTeacherProfileListItemDtoSchema>;

export const AdminListTeachersQueryDtoSchema = z.object({
  take: z.coerce.number().int().min(1).max(500).optional(),
  cursor: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
});
export type AdminListTeachersQueryDto = z.infer<typeof AdminListTeachersQueryDtoSchema>;

export const AdminListTeachersResponseDtoSchema = z.object({
  teachers: z.array(AdminTeacherProfileListItemDtoSchema),
  nextCursor: z.string().min(1).optional(),
});
export type AdminListTeachersResponseDto = z.infer<typeof AdminListTeachersResponseDtoSchema>;

export const AdminStudentProfileListItemDtoSchema = z.object({
  userId: z.string().min(1),
  userEmail: z.string().email(),
  displayName: z.string().min(1).optional(),
  alfaExternalId: z.string().min(1).optional(),
});
export type AdminStudentProfileListItemDto = z.infer<typeof AdminStudentProfileListItemDtoSchema>;

export const AdminListStudentsQueryDtoSchema = z.object({
  take: z.coerce.number().int().min(1).max(500).optional(),
  cursor: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
});
export type AdminListStudentsQueryDto = z.infer<typeof AdminListStudentsQueryDtoSchema>;

export const AdminListStudentsResponseDtoSchema = z.object({
  students: z.array(AdminStudentProfileListItemDtoSchema),
  nextCursor: z.string().min(1).optional(),
});
export type AdminListStudentsResponseDto = z.infer<typeof AdminListStudentsResponseDtoSchema>;

