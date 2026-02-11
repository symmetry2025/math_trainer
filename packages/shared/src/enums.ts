import { z } from "zod";

/**
 * Baseline enums shared between API/Web/Bot/Worker.
 *
 * Convention: DTO enums are lower-case; DB enums are stored as UPPERCASE (map in API).
 */

export const UserRoleSchema = z.enum(["user", "admin", "teacher", "parent", "student"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const AuthErrorCodeSchema = z.enum([
  "INVALID_CREDENTIALS",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "INVALID_INVITE",
  "INVITE_NOT_ACTIVE",
  "INVITE_EXPIRED",
  "INVITE_ALREADY_CLAIMED",
  "EMAIL_ALREADY_USED",
  "PHONE_ALREADY_USED",
  "PARENT_ALREADY_LINKED",
]);
export type AuthErrorCode = z.infer<typeof AuthErrorCodeSchema>;

export const AttendanceStatusSchema = z.enum(["present", "absent", "late"]);
export type AttendanceStatus = z.infer<typeof AttendanceStatusSchema>;

export const StudentLessonStatusSchema = z.enum(["draft", "submitted", "locked"]);
export type StudentLessonStatus = z.infer<typeof StudentLessonStatusSchema>;

export const OutboxStatusSchema = z.enum(["pending", "processing", "completed", "failed"]);
export type OutboxStatus = z.infer<typeof OutboxStatusSchema>;

export const OutboxKind = {
  OCCURRENCE_REPORT_SUBMITTED: "OCCURRENCE_REPORT_SUBMITTED",
  ADMIN_PASSWORD_RESET_EMAIL: "ADMIN_PASSWORD_RESET_EMAIL",
} as const;
export type OutboxKind = keyof typeof OutboxKind;
