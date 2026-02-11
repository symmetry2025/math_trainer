import { z } from 'zod';

export const AdminScheduleImportEntitySchema = z.enum([
  'branch',
  'teacher',
  'student',
  'slot',
  'slotEnrollment',
  'slotTeacherAssignment',
  'slotOccurrence',
  'occurrenceTeacherAssignment',
]);
export type AdminScheduleImportEntity = z.infer<typeof AdminScheduleImportEntitySchema>;

export const AdminScheduleImportErrorDtoSchema = z
  .object({
    entity: AdminScheduleImportEntitySchema,
    externalId: z.string().min(1).optional(),
    message: z.string().min(1),
    path: z.array(z.union([z.string(), z.number()])).optional(),
  })
  .strict();
export type AdminScheduleImportErrorDto = z.infer<typeof AdminScheduleImportErrorDtoSchema>;

export const AdminScheduleImportSummaryDtoSchema = z
  .object({
    slots: z
      .object({
        created: z.number().int().min(0),
        updated: z.number().int().min(0),
      })
      .strict(),
    slotTeacherAssignments: z
      .object({
        created: z.number().int().min(0),
        updated: z.number().int().min(0),
        closed: z.number().int().min(0),
      })
      .strict(),
    slotEnrollments: z
      .object({
        created: z.number().int().min(0),
        updated: z.number().int().min(0),
        closed: z.number().int().min(0),
      })
      .strict(),
    occurrences: z
      .object({
        created: z.number().int().min(0),
        skippedExisting: z.number().int().min(0),
      })
      .strict(),
    occurrenceTeacherAssignments: z
      .object({
        created: z.number().int().min(0),
        updated: z.number().int().min(0),
        skippedExisting: z.number().int().min(0),
      })
      .strict(),
  })
  .strict();
export type AdminScheduleImportSummaryDto = z.infer<typeof AdminScheduleImportSummaryDtoSchema>;

export const AdminScheduleImportResponseDtoSchema = z
  .object({
    ok: z.boolean(),
    importedAt: z.string().min(1),
    branchId: z.string().min(1),
    schemaVersion: z.literal(1),
    summary: AdminScheduleImportSummaryDtoSchema,
    errors: z.array(AdminScheduleImportErrorDtoSchema),
  })
  .strict();
export type AdminScheduleImportResponseDto = z.infer<typeof AdminScheduleImportResponseDtoSchema>;

