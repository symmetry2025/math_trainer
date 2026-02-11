import { z } from "zod";

import { AttendanceStatusSchema, StudentLessonStatusSchema } from "../enums";
import {
  IsoDateTimeStringSchema,
  OccurrenceIdSchema,
  StudentLessonIdSchema,
  UserIdSchema,
} from "../ids";

const MAX_STUDENT_SELF_LESSONS_RANGE_DAYS = 31;
const MAX_STUDENT_SELF_LESSONS_RANGE_MS =
  MAX_STUDENT_SELF_LESSONS_RANGE_DAYS * 24 * 60 * 60 * 1000;

export const StudentLessonDtoSchema = z.object({
  id: StudentLessonIdSchema,
  occurrenceId: OccurrenceIdSchema,
  studentId: UserIdSchema,
  responsibleTeacherId: UserIdSchema,
  lastEditedByTeacherId: UserIdSchema.nullable().optional(),
  attendance: AttendanceStatusSchema.nullable().optional(),
  comment: z.string().nullable().optional(),
  status: StudentLessonStatusSchema,
  submittedAt: IsoDateTimeStringSchema.nullable().optional(),
  lockedAt: IsoDateTimeStringSchema.nullable().optional(),
  createdAt: IsoDateTimeStringSchema.optional(),
  updatedAt: IsoDateTimeStringSchema,
});
export type StudentLessonDto = z.infer<typeof StudentLessonDtoSchema>;

export const CreateStudentLessonRequestDtoSchema = z.object({
  occurrenceId: OccurrenceIdSchema,
  studentId: UserIdSchema,
  attendance: AttendanceStatusSchema.optional(),
  comment: z.string().optional(),
  status: StudentLessonStatusSchema.optional(),
});
export type CreateStudentLessonRequestDto = z.infer<typeof CreateStudentLessonRequestDtoSchema>;

export const UpdateStudentLessonRequestDtoSchema = z.object({
  attendance: AttendanceStatusSchema.optional(),
  comment: z.string().optional(),
  status: StudentLessonStatusSchema.optional(),
});
export type UpdateStudentLessonRequestDto = z.infer<typeof UpdateStudentLessonRequestDtoSchema>;

// Convenience DTO for teacher autosave flows (draft upsert).
export const UpsertStudentLessonRequestDtoSchema = z.object({
  attendance: AttendanceStatusSchema.optional(),
  comment: z.string().optional(),
});
export type UpsertStudentLessonRequestDto = z.infer<typeof UpsertStudentLessonRequestDtoSchema>;

// Response DTOs for teacher flow: list of students for an occurrence.
export const TeacherLessonStudentDtoSchema = z.object({
  id: UserIdSchema,
  displayName: z.string().nullable(),
  lesson: StudentLessonDtoSchema.nullable().optional(),
});
export type TeacherLessonStudentDto = z.infer<typeof TeacherLessonStudentDtoSchema>;

export const TeacherLessonStudentsResponseDtoSchema = z.object({
  students: z.array(TeacherLessonStudentDtoSchema),
});
export type TeacherLessonStudentsResponseDto = z.infer<typeof TeacherLessonStudentsResponseDtoSchema>;

// Student self-view: list of own lessons (for student UI).
export const StudentSelfLessonListItemDtoSchema = z.object({
  id: StudentLessonIdSchema,
  date: IsoDateTimeStringSchema,
  teacherName: z.string(),
  attendance: AttendanceStatusSchema.nullable(),
});
export type StudentSelfLessonListItemDto = z.infer<typeof StudentSelfLessonListItemDtoSchema>;

export const StudentSelfLessonsQueryDtoSchema = z
  .object({
    from: IsoDateTimeStringSchema.optional(),
    to: IsoDateTimeStringSchema.optional(),
    take: z.coerce.number().int().min(1).max(50).optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.from && !v.to) return;
    if (!v.from || !v.to) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid range: from and to must be provided together",
      });
      return;
    }

    const from = new Date(v.from);
    const to = new Date(v.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid from/to datetime" });
      return;
    }
    if (to.getTime() <= from.getTime()) {
      ctx.addIssue({ code: "custom", message: "Invalid range: to must be after from" });
      return;
    }
    if (to.getTime() - from.getTime() > MAX_STUDENT_SELF_LESSONS_RANGE_MS) {
      ctx.addIssue({
        code: "custom",
        message: `Range too large: max ${MAX_STUDENT_SELF_LESSONS_RANGE_DAYS} days`,
      });
    }
  });
export type StudentSelfLessonsQueryDto = z.infer<typeof StudentSelfLessonsQueryDtoSchema>;

export const StudentSelfLessonsResponseDtoSchema = z.object({
  lessons: z.array(StudentSelfLessonListItemDtoSchema),
});
export type StudentSelfLessonsResponseDto = z.infer<typeof StudentSelfLessonsResponseDtoSchema>;
