import { z } from 'zod';

import { IsoDateTimeStringSchema } from '../ids';

/**
 * Schedule import JSON (v1)
 *
 * Source of truth: `docs/PROJECT_BRIEF.md` → "11) JSON Import (окончательная спецификация)".
 *
 * Notes:
 * - This is shared contract only (validation + types). API import endpoint is out of scope.
 * - Formats are intentionally strict for key fields to fail fast.
 */

export const ScheduleImportJsonV1SchemaVersionSchema = z.literal(1);
export type ScheduleImportJsonV1SchemaVersion = z.infer<
  typeof ScheduleImportJsonV1SchemaVersionSchema
>;

export const ScheduleImportJsonV1DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
export type ScheduleImportJsonV1DateString = z.infer<
  typeof ScheduleImportJsonV1DateStringSchema
>;

export const ScheduleImportJsonV1TimeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM (00:00..23:59)');
export type ScheduleImportJsonV1TimeString = z.infer<
  typeof ScheduleImportJsonV1TimeStringSchema
>;

/**
 * IANA timezone string (best-effort).
 * We keep it slightly permissive to avoid false negatives for valid zones.
 */
export const ScheduleImportJsonV1TimezoneSchema = z
  .string()
  .min(1)
  .regex(/^[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)+$/, 'Expected IANA timezone');
export type ScheduleImportJsonV1Timezone = z.infer<typeof ScheduleImportJsonV1TimezoneSchema>;

export const ScheduleImportJsonV1EntityStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export type ScheduleImportJsonV1EntityStatus = z.infer<
  typeof ScheduleImportJsonV1EntityStatusSchema
>;

export const ScheduleImportJsonV1BranchSchema = z
  .object({
    externalId: z.string().min(1),
    name: z.string().min(1),
    timezone: ScheduleImportJsonV1TimezoneSchema,
  })
  .strict();
export type ScheduleImportJsonV1Branch = z.infer<typeof ScheduleImportJsonV1BranchSchema>;

export const ScheduleImportJsonV1TeacherSchema = z
  .object({
    externalId: z.string().min(1),
    fullName: z.string().min(1),
    status: ScheduleImportJsonV1EntityStatusSchema,
  })
  .strict();
export type ScheduleImportJsonV1Teacher = z.infer<typeof ScheduleImportJsonV1TeacherSchema>;

export const ScheduleImportJsonV1StudentSchema = z
  .object({
    externalId: z.string().min(1),
    fullName: z.string().min(1),
    grade: z.number().int().min(1).max(12).optional(),
    status: ScheduleImportJsonV1EntityStatusSchema,
  })
  .strict();
export type ScheduleImportJsonV1Student = z.infer<typeof ScheduleImportJsonV1StudentSchema>;

export const ScheduleImportJsonV1SlotTeachersSchema = z
  .object({
    mainTeacherExternalId: z.string().min(1),
    coTeacherExternalIds: z.array(z.string().min(1)).default([]),
  })
  .strict();
export type ScheduleImportJsonV1SlotTeachers = z.infer<
  typeof ScheduleImportJsonV1SlotTeachersSchema
>;

export const ScheduleImportJsonV1SlotEnrollmentSchema = z
  .object({
    studentExternalId: z.string().min(1),
    status: ScheduleImportJsonV1EntityStatusSchema,
    validFrom: ScheduleImportJsonV1DateStringSchema,
    validTo: z
      .union([ScheduleImportJsonV1DateStringSchema, z.null()])
      .optional()
      .default(null),
  })
  .strict()
  .superRefine((value, ctx) => {
    const { validFrom, validTo } = value;
    if (!validTo) return;
    if (validFrom > validTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validFrom must be <= validTo',
        path: ['validFrom'],
      });
    }
  });
export type ScheduleImportJsonV1SlotEnrollment = z.infer<
  typeof ScheduleImportJsonV1SlotEnrollmentSchema
>;

function parseTimeToMinutes(time: string): number {
  const [hh, mm] = time.split(':').map((x) => Number(x));
  return hh * 60 + mm;
}

export const ScheduleImportJsonV1SlotSchema = z
  .object({
    externalId: z.string().min(1),
    title: z.string().min(1).optional(),
    weekday: z.number().int().min(0).max(6),
    startTime: ScheduleImportJsonV1TimeStringSchema,
    endTime: ScheduleImportJsonV1TimeStringSchema,
    status: ScheduleImportJsonV1EntityStatusSchema,
    teachers: ScheduleImportJsonV1SlotTeachersSchema,
    enrollments: z.array(ScheduleImportJsonV1SlotEnrollmentSchema).optional().default([]),
  })
  .strict()
  .superRefine((value, ctx) => {
    const start = parseTimeToMinutes(value.startTime);
    const end = parseTimeToMinutes(value.endTime);
    if (Number.isNaN(start) || Number.isNaN(end)) return;
    if (start >= end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startTime must be before endTime',
        path: ['startTime'],
      });
    }
  });
export type ScheduleImportJsonV1Slot = z.infer<typeof ScheduleImportJsonV1SlotSchema>;

export const ScheduleImportJsonV1Schema = z
  .object({
    schemaVersion: ScheduleImportJsonV1SchemaVersionSchema,
    generatedAt: IsoDateTimeStringSchema,
    branch: ScheduleImportJsonV1BranchSchema,
    horizonDays: z.number().int().min(1).max(366),
    teachers: z.array(ScheduleImportJsonV1TeacherSchema),
    students: z.array(ScheduleImportJsonV1StudentSchema),
    slots: z.array(ScheduleImportJsonV1SlotSchema),
  })
  .strict();
export type ScheduleImportJsonV1 = z.infer<typeof ScheduleImportJsonV1Schema>;

/**
 * Examples (for "How to verify" in the issue).
 * These are NOT executed automatically; consumers can import and call `.parse(...)`.
 */
export const ScheduleImportJsonV1SamplePayload: ScheduleImportJsonV1 = {
  schemaVersion: 1,
  generatedAt: '2026-01-02T12:00:00Z',
  branch: {
    externalId: 'branch-1',
    name: 'Main Branch',
    timezone: 'Europe/Moscow',
  },
  horizonDays: 28,
  teachers: [
    { externalId: 't-1001', fullName: 'Иван Петров', status: 'ACTIVE' },
    { externalId: 't-1002', fullName: 'Мария Иванова', status: 'ACTIVE' },
  ],
  students: [{ externalId: 's-2001', fullName: 'Павел Иванов', grade: 5, status: 'ACTIVE' }],
  slots: [
    {
      externalId: 'slot-3001',
      title: 'Пн 18:00 — Математика',
      weekday: 1,
      startTime: '18:00',
      endTime: '19:00',
      status: 'ACTIVE',
      teachers: { mainTeacherExternalId: 't-1001', coTeacherExternalIds: ['t-1002'] },
      enrollments: [
        { studentExternalId: 's-2001', status: 'ACTIVE', validFrom: '2026-01-01', validTo: null },
      ],
    },
  ],
};

export const ScheduleImportJsonV1NegativeSamples: Array<{
  name: string;
  payload: unknown;
}> = [
  {
    name: 'schemaVersion != 1',
    payload: { ...ScheduleImportJsonV1SamplePayload, schemaVersion: 2 },
  },
  {
    name: 'invalid time format',
    payload: {
      ...ScheduleImportJsonV1SamplePayload,
      slots: [{ ...ScheduleImportJsonV1SamplePayload.slots[0], startTime: '25:00' }],
    },
  },
];

