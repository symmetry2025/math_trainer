import { z } from 'zod';

import { IsoDateTimeStringSchema } from '../ids';

export const ScheduleStatusDtoSchema = z.enum(['active', 'inactive']);
export type ScheduleStatusDto = z.infer<typeof ScheduleStatusDtoSchema>;

export const TeacherAssignmentRoleDtoSchema = z.enum(['main', 'co']);
export type TeacherAssignmentRoleDto = z.infer<typeof TeacherAssignmentRoleDtoSchema>;

export const SlotOccurrenceStatusDtoSchema = z.enum(['planned', 'completed', 'canceled']);
export type SlotOccurrenceStatusDto = z.infer<typeof SlotOccurrenceStatusDtoSchema>;

export const ScheduleCalendarQueryDtoSchema = z
  .object({
    branchId: z.string().min(1).optional(),
    from: IsoDateTimeStringSchema,
    to: IsoDateTimeStringSchema,
    slotId: z.string().min(1).optional(),
    teacherId: z.string().min(1).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .refine(
    (data) => {
      const from = new Date(data.from);
      const to = new Date(data.to);
      return to > from;
    },
    {
      message: 'Invalid range: to must be after from',
      path: ['to'],
    },
  )
  .refine(
    (data) => {
      const from = new Date(data.from);
      const to = new Date(data.to);
      const diff = to.getTime() - from.getTime();
      const maxRange = 31 * 24 * 60 * 60 * 1000;
      return diff <= maxRange;
    },
    {
      message: 'Range too large: max 31 days',
      path: ['to'],
    },
  );
export type ScheduleCalendarQueryDto = z.infer<typeof ScheduleCalendarQueryDtoSchema>;

export const ScheduleCalendarSlotDtoSchema = z.object({
  id: z.string().min(1),
  branchId: z.string().min(1),
  title: z.string().optional(),
  weekday: z.number().int(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  status: ScheduleStatusDtoSchema,
});
export type ScheduleCalendarSlotDto = z.infer<typeof ScheduleCalendarSlotDtoSchema>;

export const ScheduleCalendarTeacherDtoSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().optional(),
});
export type ScheduleCalendarTeacherDto = z.infer<typeof ScheduleCalendarTeacherDtoSchema>;

export const ScheduleCalendarTeacherAssignmentDtoSchema = z.object({
  teacher: ScheduleCalendarTeacherDtoSchema,
  role: TeacherAssignmentRoleDtoSchema,
  canWrite: z.boolean(),
  delegatedByTeacher: ScheduleCalendarTeacherDtoSchema.optional(),
  delegatedAt: IsoDateTimeStringSchema.optional(),
});
export type ScheduleCalendarTeacherAssignmentDto = z.infer<
  typeof ScheduleCalendarTeacherAssignmentDtoSchema
>;

export const ScheduleCalendarOccurrenceDtoSchema = z.object({
  id: z.string().min(1),
  slotId: z.string().min(1),
  startsAt: IsoDateTimeStringSchema,
  endsAt: IsoDateTimeStringSchema,
  status: SlotOccurrenceStatusDtoSchema,
  studentsCount: z.number().int().nonnegative(),
  slot: ScheduleCalendarSlotDtoSchema,
  teacherAssignments: z.array(ScheduleCalendarTeacherAssignmentDtoSchema),
});
export type ScheduleCalendarOccurrenceDto = z.infer<typeof ScheduleCalendarOccurrenceDtoSchema>;

export const ScheduleCalendarResponseDtoSchema = z.object({
  occurrences: z.array(ScheduleCalendarOccurrenceDtoSchema),
  total: z.number().int().nonnegative(),
});
export type ScheduleCalendarResponseDto = z.infer<typeof ScheduleCalendarResponseDtoSchema>;

