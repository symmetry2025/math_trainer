import { z } from 'zod';

import { IsoDateTimeStringSchema } from '../ids';
import { ParentInviteStatusSchema } from './admin-parent-invites';

export const AdminParentChildLinkDtoSchema = z.object({
  studentId: z.string().min(1),
  studentEmail: z.string().email(),
  studentDisplayName: z.string().min(1).optional(),
  linkedAt: IsoDateTimeStringSchema,
});
export type AdminParentChildLinkDto = z.infer<typeof AdminParentChildLinkDtoSchema>;

export const AdminParentInviteListItemDtoSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  status: ParentInviteStatusSchema,
  expiresAt: IsoDateTimeStringSchema.optional(),
  createdAt: IsoDateTimeStringSchema,
});
export type AdminParentInviteListItemDto = z.infer<typeof AdminParentInviteListItemDtoSchema>;

export const AdminGetParentResponseDtoSchema = z.object({
  parent: z.object({
    id: z.string().min(1),
    branchId: z.string().min(1),
    fullName: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
    userEmail: z.string().email().optional(),
    userDisplayName: z.string().min(1).optional(),
    userIsBlocked: z.boolean().optional(),
    createdAt: IsoDateTimeStringSchema,
    updatedAt: IsoDateTimeStringSchema,
  }),
  children: z.array(AdminParentChildLinkDtoSchema),
  invites: z.array(AdminParentInviteListItemDtoSchema),
});
export type AdminGetParentResponseDto = z.infer<typeof AdminGetParentResponseDtoSchema>;

