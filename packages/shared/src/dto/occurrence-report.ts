import { z } from "zod";

import { IsoDateTimeStringSchema } from "../ids";
import { AttendanceStatusSchema } from "../enums";
import { SlotOccurrenceStatusDtoSchema } from "./schedule-calendar";

export const OccurrenceStudentDtoSchema = z.object({
  id: z.string(),
  displayName: z.string().optional(),
  attendance: z
    .object({
      status: AttendanceStatusSchema,
      comment: z.string().optional(),
    })
    .optional(),
});
export type OccurrenceStudentDto = z.infer<typeof OccurrenceStudentDtoSchema>;

export const OccurrenceTeacherDtoSchema = z.object({
  id: z.string(),
  displayName: z.string().optional(),
  role: z.enum(["MAIN", "CO"]),
  canWrite: z.boolean(),
  delegatedBy: z.string().optional(),
  delegatedAt: IsoDateTimeStringSchema.optional(),
});
export type OccurrenceTeacherDto = z.infer<typeof OccurrenceTeacherDtoSchema>;

export const OccurrenceReportDetailsDtoSchema = z.object({
  id: z.string(),
  startsAt: IsoDateTimeStringSchema,
  endsAt: IsoDateTimeStringSchema,
  status: SlotOccurrenceStatusDtoSchema,
  slotTitle: z.string().optional(),
  students: z.array(OccurrenceStudentDtoSchema),
  teachers: z.array(OccurrenceTeacherDtoSchema),
});
export type OccurrenceReportDetailsDto = z.infer<typeof OccurrenceReportDetailsDtoSchema>;

export const UpdateAttendanceRequestDtoSchema = z.object({
  status: AttendanceStatusSchema,
  comment: z.string().optional(),
});
export type UpdateAttendanceRequestDto = z.infer<typeof UpdateAttendanceRequestDtoSchema>;

export const ToggleTeacherWriteRequestDtoSchema = z.object({
  canWrite: z.boolean(),
});
export type ToggleTeacherWriteRequestDto = z.infer<typeof ToggleTeacherWriteRequestDtoSchema>;

export const SubmitReportResponseDtoSchema = z.object({
  status: SlotOccurrenceStatusDtoSchema,
});
export type SubmitReportResponseDto = z.infer<typeof SubmitReportResponseDtoSchema>;

export const OccurrenceReportSubmittedPayloadSchema = z.object({
  occurrenceId: z.string(),
  studentId: z.string(),
});
export type OccurrenceReportSubmittedPayload = z.infer<
  typeof OccurrenceReportSubmittedPayloadSchema
>;

export const BulkSubmitReportRequestDtoSchema = z.object({
  attendances: z
    .array(
      z.object({
        studentId: z.string(),
        status: AttendanceStatusSchema,
        comment: z.string().optional(),
      }),
    )
    .max(200, "Too many attendances. Maximum 200 items allowed.")
    .refine(
      (items) => {
        const ids = items.map((i) => i.studentId);
        return new Set(ids).size === ids.length;
      },
      {
        message: "Duplicate studentId found in request",
      },
    ),
});
export type BulkSubmitReportRequestDto = z.infer<typeof BulkSubmitReportRequestDtoSchema>;
