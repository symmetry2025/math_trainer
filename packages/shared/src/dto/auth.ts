import { z } from 'zod';

import {
  IsoDateTimeStringSchema,
  SessionIdSchema,
  UserIdSchema,
} from '../ids';
import { AuthErrorCodeSchema, UserRoleSchema } from '../enums';

/**
 * Auth DTO baseline.
 *
 * Out of scope for this issue: actual API implementation, cookies/sessions, guards.
 * Here we define shared request/response shapes so all consumers stay in sync.
 */

export const AuthUserDtoSchema = z.object({
  id: UserIdSchema,
  email: z.string().email().optional(),
  role: UserRoleSchema,
  roles: z.array(UserRoleSchema),
  isBlocked: z.boolean().optional(),
  createdAt: IsoDateTimeStringSchema.optional(),
});
export type AuthUserDto = z.infer<typeof AuthUserDtoSchema>;

export const AuthSessionDtoSchema = z.object({
  id: SessionIdSchema,
  userId: UserIdSchema,
  createdAt: IsoDateTimeStringSchema.optional(),
});
export type AuthSessionDto = z.infer<typeof AuthSessionDtoSchema>;

export const AuthMeResponseDtoSchema = z.object({
  user: AuthUserDtoSchema,
  session: AuthSessionDtoSchema.optional(),
  profile: z
    .object({
      displayName: z.string().min(1),
    })
    .optional(),
});
export type AuthMeResponseDto = z.infer<typeof AuthMeResponseDtoSchema>;

function isPhoneLike(raw: string): boolean {
  // Accept common formats like: +7 999 123-45-67, 89991234567, (999)1234567
  const digits = raw.replace(/[^\d]/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

const AuthLoginIdentifierSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (v) => z.string().email().safeParse(v).success || isPhoneLike(v),
    'Expected email or phone number',
  );

export const AuthSignInRequestDtoSchema = z.object({
  // Backward-compatible field name: 'email'. Can contain email OR phone.
  email: AuthLoginIdentifierSchema,
  password: z.string().min(1),
});
export type AuthSignInRequestDto = z.infer<typeof AuthSignInRequestDtoSchema>;

export const AuthParentSignUpRequestDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  inviteCode: z.string().min(1),
});
export type AuthParentSignUpRequestDto = z.infer<typeof AuthParentSignUpRequestDtoSchema>;

// Unified invite signup (parent/student/teacher)
export const AuthInviteSignUpRequestDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  inviteCode: z.string().min(1),
});
export type AuthInviteSignUpRequestDto = z.infer<typeof AuthInviteSignUpRequestDtoSchema>;

export const AuthSignInResponseDtoSchema = z.object({
  user: AuthUserDtoSchema,
  session: AuthSessionDtoSchema,
});
export type AuthSignInResponseDto = z.infer<typeof AuthSignInResponseDtoSchema>;

export const AuthSignOutResponseDtoSchema = z.object({
  ok: z.literal(true),
});
export type AuthSignOutResponseDto = z.infer<typeof AuthSignOutResponseDtoSchema>;

export const AuthPasswordResetRequestRequestDtoSchema = z.object({
  email: z.string().email(),
});
export type AuthPasswordResetRequestRequestDto = z.infer<typeof AuthPasswordResetRequestRequestDtoSchema>;

export const AuthPasswordResetRequestResponseDtoSchema = z.object({
  ok: z.literal(true),
});
export type AuthPasswordResetRequestResponseDto = z.infer<typeof AuthPasswordResetRequestResponseDtoSchema>;

export const AuthPasswordResetConfirmRequestDtoSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(1),
});
export type AuthPasswordResetConfirmRequestDto = z.infer<typeof AuthPasswordResetConfirmRequestDtoSchema>;

export const AuthPasswordResetConfirmResponseDtoSchema = z.object({
  ok: z.literal(true),
});
export type AuthPasswordResetConfirmResponseDto = z.infer<typeof AuthPasswordResetConfirmResponseDtoSchema>;

export const AuthConfirmEmailRequestDtoSchema = z.object({
  token: z.string().min(1),
});
export type AuthConfirmEmailRequestDto = z.infer<typeof AuthConfirmEmailRequestDtoSchema>;

export const AuthConfirmEmailResponseDtoSchema = z.object({
  ok: z.literal(true),
});
export type AuthConfirmEmailResponseDto = z.infer<typeof AuthConfirmEmailResponseDtoSchema>;

export const AuthErrorDtoSchema = z.object({
  code: AuthErrorCodeSchema,
  message: z.string(),
});
export type AuthErrorDto = z.infer<typeof AuthErrorDtoSchema>;


