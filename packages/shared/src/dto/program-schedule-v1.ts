import { z } from 'zod';

import { IsoDateTimeStringSchema, UserIdSchema } from '../ids';
import { ScheduleStatusDtoSchema, SlotOccurrenceStatusDtoSchema } from './schedule-calendar';
import { StudentBacklogItemDtoSchema } from './student-process-os-v1';

/**
 * Program schedule v1 (Gantt): plan backlog items (topics) per lesson occurrence.
 *
 * Teacher-scope API:
 * - GET schedule range (occurrences + assigned backlog items)
 * - PATCH backlog item occurrence assignment
 */

export const TeacherProgramScheduleQueryDtoSchema = z
  .object({
    studentId: UserIdSchema,
    from: IsoDateTimeStringSchema,
    to: IsoDateTimeStringSchema,
  })
  .refine(
    (data) => {
      const from = new Date(data.from);
      const to = new Date(data.to);
      return to > from;
    },
    { message: 'Invalid range: to must be after from', path: ['to'] },
  )
  .refine(
    (data) => {
      const from = new Date(data.from);
      const to = new Date(data.to);
      const diff = to.getTime() - from.getTime();
      const maxRange = 31 * 24 * 60 * 60 * 1000;
      return diff <= maxRange;
    },
    { message: 'Range too large: max 31 days', path: ['to'] },
  );
export type TeacherProgramScheduleQueryDto = z.infer<typeof TeacherProgramScheduleQueryDtoSchema>;

export const ProgramScheduleSlotDtoSchema = z.object({
  id: z.string().min(1),
  branchId: z.string().min(1),
  title: z.string().optional(),
  weekday: z.number().int(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  status: ScheduleStatusDtoSchema,
});
export type ProgramScheduleSlotDto = z.infer<typeof ProgramScheduleSlotDtoSchema>;

export const ProgramScheduleOccurrenceDtoSchema = z.object({
  id: z.string().min(1),
  slotId: z.string().min(1),
  startsAt: IsoDateTimeStringSchema,
  endsAt: IsoDateTimeStringSchema,
  status: SlotOccurrenceStatusDtoSchema,
  slot: ProgramScheduleSlotDtoSchema,
});
export type ProgramScheduleOccurrenceDto = z.infer<typeof ProgramScheduleOccurrenceDtoSchema>;

export const TeacherProgramStudentsQueryDtoSchema = z.object({
  search: z.string().optional(),
});
export type TeacherProgramStudentsQueryDto = z.infer<typeof TeacherProgramStudentsQueryDtoSchema>;

export const TeacherProgramStudentsResponseDtoSchema = z.object({
  students: z.array(z.object({
    userId: z.string(),
    userEmail: z.string(),
    displayName: z.string().optional(),
  })),
});
export type TeacherProgramStudentsResponseDto = z.infer<
  typeof TeacherProgramStudentsResponseDtoSchema
>;

export const TeacherProgramScheduleResponseDtoSchema = z.object({
  occurrences: z.array(ProgramScheduleOccurrenceDtoSchema),
  backlogItems: z.array(StudentBacklogItemDtoSchema),
});
export type TeacherProgramScheduleResponseDto = z.infer<
  typeof TeacherProgramScheduleResponseDtoSchema
>;

export const PatchBacklogItemOccurrenceRequestDtoSchema = z.object({
  occurrenceId: z.string().min(1).nullable(),
});
export type PatchBacklogItemOccurrenceRequestDto = z.infer<
  typeof PatchBacklogItemOccurrenceRequestDtoSchema
>;

