import { z } from "zod";

import { AttendanceStatusSchema, StudentLessonStatusSchema } from "../enums";
import {
  IsoDateTimeStringSchema,
  OccurrenceIdSchema,
  StudentLessonIdSchema,
  UserIdSchema,
} from "../ids";
import { ParentInviteStatusSchema } from "./admin-parent-invites";

export const AdminStudentInviteCardDtoSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  status: ParentInviteStatusSchema,
  expiresAt: IsoDateTimeStringSchema.optional(),
  createdAt: IsoDateTimeStringSchema,
});
export type AdminStudentInviteCardDto = z.infer<typeof AdminStudentInviteCardDtoSchema>;

export const AdminStudentCardDtoSchema = z.object({
  userId: UserIdSchema,
  userEmail: z.string().email(),
  displayName: z.string().min(1).optional(),
  alfaExternalId: z.string().min(1).optional(),
  isBlocked: z.boolean(),
});
export type AdminStudentCardDto = z.infer<typeof AdminStudentCardDtoSchema>;

export const AdminGetStudentResponseDtoSchema = z.object({
  student: AdminStudentCardDtoSchema,
  invite: AdminStudentInviteCardDtoSchema.optional(),
});
export type AdminGetStudentResponseDto = z.infer<typeof AdminGetStudentResponseDtoSchema>;

const MAX_ADMIN_STUDENT_LESSONS_RANGE_DAYS = 62;
const MAX_ADMIN_STUDENT_LESSONS_RANGE_MS =
  MAX_ADMIN_STUDENT_LESSONS_RANGE_DAYS * 24 * 60 * 60 * 1000;

export const AdminStudentLessonsQueryDtoSchema = z
  .object({
    from: IsoDateTimeStringSchema.optional(),
    to: IsoDateTimeStringSchema.optional(),
    take: z.coerce.number().int().min(1).max(100).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.from === undefined && v.to === undefined) return;
    if (v.from === undefined || v.to === undefined) {
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
    if (to.getTime() - from.getTime() > MAX_ADMIN_STUDENT_LESSONS_RANGE_MS) {
      ctx.addIssue({
        code: "custom",
        message: `Range too large: max ${MAX_ADMIN_STUDENT_LESSONS_RANGE_DAYS} days`,
      });
    }
  });
export type AdminStudentLessonsQueryDto = z.infer<typeof AdminStudentLessonsQueryDtoSchema>;

export const AdminStudentLessonListItemDtoSchema = z.object({
  id: StudentLessonIdSchema,
  occurrenceId: OccurrenceIdSchema,
  startsAt: IsoDateTimeStringSchema,
  teacherId: UserIdSchema,
  teacherName: z.string().min(1),
  attendance: AttendanceStatusSchema.nullable(),
  status: StudentLessonStatusSchema,
  comment: z.string().nullable().optional(),
});
export type AdminStudentLessonListItemDto = z.infer<typeof AdminStudentLessonListItemDtoSchema>;

export const AdminStudentLessonsResponseDtoSchema = z.object({
  lessons: z.array(AdminStudentLessonListItemDtoSchema),
});
export type AdminStudentLessonsResponseDto = z.infer<typeof AdminStudentLessonsResponseDtoSchema>;
