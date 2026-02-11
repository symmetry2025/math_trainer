import { z } from "zod";

import { UserRoleSchema } from "../enums";
import { IsoDateTimeStringSchema, UserIdSchema } from "../ids";

export const AdminUserEntityKindSchema = z.enum(["teacher", "student", "parent"]);
export type AdminUserEntityKind = z.infer<typeof AdminUserEntityKindSchema>;

export const AdminUserStatusSchema = z.enum(["blocked", "pending", "active"]);
export type AdminUserStatus = z.infer<typeof AdminUserStatusSchema>;

export const AdminUserListItemDtoSchema = z.object({
  id: UserIdSchema,
  fullName: z.string().min(1).optional(),
  role: UserRoleSchema,
  email: z.string().email(),
  entityKind: AdminUserEntityKindSchema.optional(),
  entityId: z.string().min(1).optional(),
  telegramUserId: z.string().min(1).optional(),
  telegramUsername: z.string().min(1).optional(),
  isBlocked: z.boolean(),
  status: AdminUserStatusSchema,
  // For UI display (e.g. "Активен с ...")
  createdAt: IsoDateTimeStringSchema,
  emailVerifiedAt: IsoDateTimeStringSchema.optional(),
});
export type AdminUserListItemDto = z.infer<typeof AdminUserListItemDtoSchema>;

export const AdminListUsersQueryDtoSchema = z.object({
  search: z.string().min(1).optional(),
  take: z.coerce.number().int().min(1).max(500).optional(),
  cursor: UserIdSchema.optional(),
});
export type AdminListUsersQueryDto = z.infer<typeof AdminListUsersQueryDtoSchema>;

export const AdminListUsersResponseDtoSchema = z.object({
  users: z.array(AdminUserListItemDtoSchema),
  nextCursor: UserIdSchema.optional(),
});
export type AdminListUsersResponseDto = z.infer<typeof AdminListUsersResponseDtoSchema>;

export const AdminGetUserResponseDtoSchema = z.object({
  user: AdminUserListItemDtoSchema,
});
export type AdminGetUserResponseDto = z.infer<typeof AdminGetUserResponseDtoSchema>;

export const AdminUpdateUserRequestDtoSchema = z.object({
  email: z.string().email().optional(),
  isBlocked: z.boolean().optional(),
  telegram: z
    .object({
      telegramUserId: z.string().regex(/^\d+$/).optional(),
      username: z.string().min(1).optional().nullable(),
    })
    .nullable()
    .optional(),
});
export type AdminUpdateUserRequestDto = z.infer<typeof AdminUpdateUserRequestDtoSchema>;

export const AdminSetUserPasswordRequestDtoSchema = z.object({
  password: z.string().min(1),
});
export type AdminSetUserPasswordRequestDto = z.infer<typeof AdminSetUserPasswordRequestDtoSchema>;

export const AdminResetUserPasswordResponseDtoSchema = z.object({
  temporaryPassword: z.string().min(1),
});
export type AdminResetUserPasswordResponseDto = z.infer<typeof AdminResetUserPasswordResponseDtoSchema>;

export const AdminUsersErrorCodeSchema = z.enum([
  "USER_NOT_FOUND",
  "EMAIL_ALREADY_USED",
  "TELEGRAM_ALREADY_LINKED",
  "CANNOT_BLOCK_LAST_ADMIN",
  "UNBLOCK_REQUIRES_PASSWORD_RESET",
  "INVALID_REQUEST",
]);
export type AdminUsersErrorCode = z.infer<typeof AdminUsersErrorCodeSchema>;

export const AdminUsersErrorDtoSchema = z
  .object({
    code: AdminUsersErrorCodeSchema,
    message: z.string().min(1),
  })
  .strict();
export type AdminUsersErrorDto = z.infer<typeof AdminUsersErrorDtoSchema>;

