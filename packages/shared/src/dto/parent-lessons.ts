import { z } from "zod";

import { StudentLessonStatusSchema } from "../enums";
import { IsoDateTimeStringSchema, StudentLessonIdSchema, UserIdSchema } from "../ids";

export const ParentLessonReportStatusSchema = z.enum(["reported", "unreported"]);
export type ParentLessonReportStatus = z.infer<typeof ParentLessonReportStatusSchema>;

export const ParentLessonsQueryDtoSchema = z.object({
  from: IsoDateTimeStringSchema,
  to: IsoDateTimeStringSchema,
  /**
   * Filter lessons by report presence.
   *
   * Backward compatible: also accepts legacy studentLesson status values.
   */
  status: z.union([ParentLessonReportStatusSchema, StudentLessonStatusSchema]).optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
});
export type ParentLessonsQueryDto = z.infer<typeof ParentLessonsQueryDtoSchema>;

export const ParentLessonListItemDtoSchema = z.object({
  id: StudentLessonIdSchema,
  date: IsoDateTimeStringSchema,
  studentId: UserIdSchema,
  studentName: z.string(),
  teacherName: z.string(),
  status: StudentLessonStatusSchema,
  reportStatus: ParentLessonReportStatusSchema,
});
export type ParentLessonListItemDto = z.infer<typeof ParentLessonListItemDtoSchema>;

export const ParentLessonsResponseDtoSchema = z.object({
  lessons: z.array(ParentLessonListItemDtoSchema),
});
export type ParentLessonsResponseDto = z.infer<typeof ParentLessonsResponseDtoSchema>;

