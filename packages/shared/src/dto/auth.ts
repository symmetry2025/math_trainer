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

/**
 * External identities linking (MAX/Telegram/...)
 *
 * Goal: unify "account" (User) and "login sources" (providers).
 * The backend should support explicit linking via short-lived one-time tokens.
 */

export const AuthIdentityProviderSchema = z.enum(['max', 'telegram']);
export type AuthIdentityProvider = z.infer<typeof AuthIdentityProviderSchema>;

export const AuthStartLinkTokenRequestDtoSchema = z.object({
  provider: AuthIdentityProviderSchema,
});
export type AuthStartLinkTokenRequestDto = z.infer<typeof AuthStartLinkTokenRequestDtoSchema>;

export const AuthStartLinkTokenResponseDtoSchema = z.object({
  ok: z.literal(true),
  provider: AuthIdentityProviderSchema,
  token: z.string().min(10),
  startParam: z.string().min(1), // e.g. "link:<token>"
  expiresAt: IsoDateTimeStringSchema,
});
export type AuthStartLinkTokenResponseDto = z.infer<typeof AuthStartLinkTokenResponseDtoSchema>;

export const AuthIdentityDtoSchema = z.object({
  provider: AuthIdentityProviderSchema,
  providerUserId: z.string().min(1).optional(),
  linkedAt: IsoDateTimeStringSchema,
  lastLoginAt: IsoDateTimeStringSchema.nullable(),
});
export type AuthIdentityDto = z.infer<typeof AuthIdentityDtoSchema>;

export const AuthListIdentitiesResponseDtoSchema = z.object({
  ok: z.literal(true),
  identities: z.array(AuthIdentityDtoSchema),
});
export type AuthListIdentitiesResponseDto = z.infer<typeof AuthListIdentitiesResponseDtoSchema>;

/**
 * Provider-first linking (mini-app → web).
 *
 * Flow:
 * - mini-app sends signed initData to start a short-lived link request
 * - user opens web `GET /link/provider?req=<requestToken>` and logs in
 * - web confirms linking using the requestToken under the user session
 */

export const AuthProviderLinkRequestStartRequestDtoSchema = z.object({
  provider: AuthIdentityProviderSchema,
  initData: z.string().min(1),
});
export type AuthProviderLinkRequestStartRequestDto = z.infer<typeof AuthProviderLinkRequestStartRequestDtoSchema>;

export const AuthProviderLinkRequestStartResponseDtoSchema = z.object({
  ok: z.literal(true),
  provider: AuthIdentityProviderSchema,
  requestToken: z.string().min(10),
  expiresAt: IsoDateTimeStringSchema,
});
export type AuthProviderLinkRequestStartResponseDto = z.infer<typeof AuthProviderLinkRequestStartResponseDtoSchema>;

export const AuthProviderLinkConfirmRequestDtoSchema = z.object({
  requestToken: z.string().min(10),
});
export type AuthProviderLinkConfirmRequestDto = z.infer<typeof AuthProviderLinkConfirmRequestDtoSchema>;

export const AuthProviderLinkConfirmResponseDtoSchema = z.object({
  ok: z.literal(true),
  provider: AuthIdentityProviderSchema,
  status: z.enum(['linked', 'already_linked']),
});
export type AuthProviderLinkConfirmResponseDto = z.infer<typeof AuthProviderLinkConfirmResponseDtoSchema>;

/**
 * WebApp login (MAX/Telegram/...)
 *
 * Used by mini-app entry pages (e.g. /max, /tg) to exchange signed initData
 * for a first-party session cookie.
 */

export const AuthWebAppLoginRequestDtoSchema = z.object({
  initData: z.string().min(1),
  // Optional override (e.g. URL param "startapp"). The backend may fall back to initData.start_param.
  startParam: z.string().trim().min(1).optional(),
});
export type AuthWebAppLoginRequestDto = z.infer<typeof AuthWebAppLoginRequestDtoSchema>;

export const AuthBillingAccessDtoSchema = z.object({
  ok: z.boolean(),
  reason: z.enum(['admin', 'trial', 'paid', 'none']),
});
export type AuthBillingAccessDto = z.infer<typeof AuthBillingAccessDtoSchema>;

export const AuthWebAppLoginResponseDtoSchema = z.object({
  ok: z.literal(true),
  redirectTo: z.string().min(1),
  startParam: z.string().nullable().optional(),
  access: AuthBillingAccessDtoSchema.optional(),
});
export type AuthWebAppLoginResponseDto = z.infer<typeof AuthWebAppLoginResponseDtoSchema>;


