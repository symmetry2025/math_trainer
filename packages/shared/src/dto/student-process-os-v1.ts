import { z } from "zod";

import { IsoDateTimeStringSchema, UserIdSchema } from "../ids";

/**
 * Student Process OS v1 (backlog/sprint/verify).
 *
 * Convention: DTO enums are lower-case; DB enums are stored as UPPERCASE (map in API).
 */

export const StudentBacklogItemStatusSchema = z.enum([
  "backlog",
  "planned",
  "in_progress",
  "in_verify",
  "done",
  "canceled",
]);
export type StudentBacklogItemStatus = z.infer<typeof StudentBacklogItemStatusSchema>;

export const StudentSprintStatusSchema = z.enum(["active", "archived"]);
export type StudentSprintStatus = z.infer<typeof StudentSprintStatusSchema>;

export const VerificationResultSchema = z.enum(["pass", "fail"]);
export type VerificationResult = z.infer<typeof VerificationResultSchema>;

const StudentBacklogItemIdSchema = z.string().min(1);
const StudentSprintIdSchema = z.string().min(1);
const StudentVerificationRunIdSchema = z.string().min(1);

export const TeacherScopeStudentQueryDtoSchema = z.object({
  studentId: UserIdSchema,
});
export type TeacherScopeStudentQueryDto = z.infer<typeof TeacherScopeStudentQueryDtoSchema>;

export const StudentBacklogItemDtoSchema = z.object({
  id: StudentBacklogItemIdSchema,
  studentId: UserIdSchema,
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  teacherComment: z.string().nullable().optional(),
  status: StudentBacklogItemStatusSchema,
  priority: z.number().int(),
  topicId: z.string().min(1).nullable().optional(),
  occurrenceId: z.string().min(1).nullable().optional(),
  sprintId: StudentSprintIdSchema.nullable().optional(),
  startedAt: IsoDateTimeStringSchema.nullable().optional(),
  verifiedAt: IsoDateTimeStringSchema.nullable().optional(),
  doneAt: IsoDateTimeStringSchema.nullable().optional(),
  createdAt: IsoDateTimeStringSchema,
  updatedAt: IsoDateTimeStringSchema,
});
export type StudentBacklogItemDto = z.infer<typeof StudentBacklogItemDtoSchema>;

export const StudentBacklogListResponseDtoSchema = z.object({
  items: z.array(StudentBacklogItemDtoSchema),
});
export type StudentBacklogListResponseDto = z.infer<typeof StudentBacklogListResponseDtoSchema>;

export const CreateStudentBacklogItemRequestDtoSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  teacherComment: z.string().optional(),
  priority: z.number().int().optional(),
  topicId: z.string().min(1).optional(),
  occurrenceId: z.string().min(1).optional(),
});
export type CreateStudentBacklogItemRequestDto = z.infer<typeof CreateStudentBacklogItemRequestDtoSchema>;

export const UpdateStudentBacklogItemRequestDtoSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  teacherComment: z.string().nullable().optional(),
  priority: z.number().int().optional(),
  topicId: z.string().min(1).nullable().optional(),
  occurrenceId: z.string().min(1).nullable().optional(),
});
export type UpdateStudentBacklogItemRequestDto = z.infer<typeof UpdateStudentBacklogItemRequestDtoSchema>;

export const UpdateStudentBacklogStatusRequestDtoSchema = z.object({
  status: StudentBacklogItemStatusSchema,
});
export type UpdateStudentBacklogStatusRequestDto = z.infer<typeof UpdateStudentBacklogStatusRequestDtoSchema>;

export const StudentSprintDtoSchema = z.object({
  id: StudentSprintIdSchema,
  studentId: UserIdSchema,
  status: StudentSprintStatusSchema,
  goal: z.string().nullable().optional(),
  wipLimit: z.number().int().nullable().optional(),
  plannedItemIds: z.array(StudentBacklogItemIdSchema),
  startedAt: IsoDateTimeStringSchema,
  endedAt: IsoDateTimeStringSchema.nullable().optional(),
  updatedAt: IsoDateTimeStringSchema,
});
export type StudentSprintDto = z.infer<typeof StudentSprintDtoSchema>;

export const StudentSprintResponseDtoSchema = z.object({
  sprint: StudentSprintDtoSchema.nullable(),
});
export type StudentSprintResponseDto = z.infer<typeof StudentSprintResponseDtoSchema>;

export const UpsertStudentSprintRequestDtoSchema = z.object({
  goal: z.string().nullable().optional(),
  wipLimit: z.number().int().nullable().optional(),
  plannedItemIds: z.array(StudentBacklogItemIdSchema).optional(),
});
export type UpsertStudentSprintRequestDto = z.infer<typeof UpsertStudentSprintRequestDtoSchema>;

export const StudentVerificationRunDtoSchema = z.object({
  id: StudentVerificationRunIdSchema,
  studentId: UserIdSchema,
  backlogItemId: StudentBacklogItemIdSchema,
  result: VerificationResultSchema,
  notes: z.string().nullable().optional(),
  runAt: IsoDateTimeStringSchema,
  recheckAt: IsoDateTimeStringSchema.nullable().optional(),
  createdAt: IsoDateTimeStringSchema,
});
export type StudentVerificationRunDto = z.infer<typeof StudentVerificationRunDtoSchema>;

export const CreateStudentVerificationRunRequestDtoSchema = z.object({
  backlogItemId: StudentBacklogItemIdSchema,
  result: VerificationResultSchema,
  notes: z.string().optional(),
  recheckAt: IsoDateTimeStringSchema.optional(),
});
export type CreateStudentVerificationRunRequestDto = z.infer<
  typeof CreateStudentVerificationRunRequestDtoSchema
>;

export const StudentMetricsDtoSchema = z.object({
  throughput7d: z.number().int(),
  avgLeadTimeHours: z.number().nullable(),
  wipCount: z.number().int(),
  debtRatio: z.number(),
});
export type StudentMetricsDto = z.infer<typeof StudentMetricsDtoSchema>;

export const StudentMetricsResponseDtoSchema = z.object({
  metrics: StudentMetricsDtoSchema,
});
export type StudentMetricsResponseDto = z.infer<typeof StudentMetricsResponseDtoSchema>;

