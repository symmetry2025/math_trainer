import { z } from 'zod';

import { IsoDateTimeStringSchema } from '../ids';
import { ParentInviteStatusSchema } from './admin-parent-invites';

export const AdminTeacherInviteCardDtoSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  status: ParentInviteStatusSchema,
  expiresAt: IsoDateTimeStringSchema.optional(),
  createdAt: IsoDateTimeStringSchema,
});
export type AdminTeacherInviteCardDto = z.infer<typeof AdminTeacherInviteCardDtoSchema>;

export const AdminTeacherOccurrenceStudentDtoSchema = z.object({
  studentId: z.string().min(1),
  studentEmail: z.string().email(),
  studentDisplayName: z.string().min(1).optional(),
});
export type AdminTeacherOccurrenceStudentDto = z.infer<typeof AdminTeacherOccurrenceStudentDtoSchema>;

export const AdminTeacherOccurrenceListItemDtoSchema = z.object({
  occurrenceId: z.string().min(1),
  slotId: z.string().min(1),
  slotTitle: z.string().min(1).optional(),
  branchId: z.string().min(1),
  startsAt: IsoDateTimeStringSchema,
  endsAt: IsoDateTimeStringSchema,
  role: z.enum(['main', 'co']).optional(),
  canWrite: z.boolean().optional(),
  students: z.array(AdminTeacherOccurrenceStudentDtoSchema),
});
export type AdminTeacherOccurrenceListItemDto = z.infer<typeof AdminTeacherOccurrenceListItemDtoSchema>;

export const AdminGetTeacherResponseDtoSchema = z.object({
  teacher: z.object({
    userId: z.string().min(1),
    userEmail: z.string().email(),
    displayName: z.string().min(1).optional(),
    alfaExternalId: z.string().min(1).optional(),
    isBlocked: z.boolean(),
  }),
  invite: AdminTeacherInviteCardDtoSchema.optional(),
  occurrences: z.array(AdminTeacherOccurrenceListItemDtoSchema),
});
export type AdminGetTeacherResponseDto = z.infer<typeof AdminGetTeacherResponseDtoSchema>;

