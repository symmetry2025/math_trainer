import { z } from 'zod';

/**
 * Baseline ID primitives.
 *
 * Intentionally minimal: IDs are non-empty strings.
 * (Do not enforce UUID/CUID until the product decides the format.)
 */
export const UserIdSchema = z.string().min(1);
export type UserId = z.infer<typeof UserIdSchema>;

export const SessionIdSchema = z.string().min(1);
export type SessionId = z.infer<typeof SessionIdSchema>;

export const RequestIdSchema = z.string().min(1);
export type RequestId = z.infer<typeof RequestIdSchema>;

export const OccurrenceIdSchema = z.string().min(1);
export type OccurrenceId = z.infer<typeof OccurrenceIdSchema>;

export const StudentLessonIdSchema = z.string().min(1);
export type StudentLessonId = z.infer<typeof StudentLessonIdSchema>;

/**
 * ISO datetime string (RFC 3339). Used for DTO serialization.
 */
export const IsoDateTimeStringSchema = z.string().datetime();
export type IsoDateTimeString = z.infer<typeof IsoDateTimeStringSchema>;


