import { z } from 'zod';

export const AdminAlfaCrmSyncUpdatedItemDtoSchema = z.object({
  kind: z.string(),
  action: z.enum(['created', 'updated']),
  externalId: z.string().optional(),
  localId: z.string().optional(),
  label: z.string().optional(),
});

export type AdminAlfaCrmSyncUpdatedItemDto = z.infer<typeof AdminAlfaCrmSyncUpdatedItemDtoSchema>;

export const AdminAlfaCrmSyncReportDtoSchema = z.object({
  ok: z.boolean(),
  scope: z.string(),
  found: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  unchanged: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative().optional(),
  message: z.string().optional(),
  rawStatus: z.unknown().optional(),
  updatedItems: z.array(AdminAlfaCrmSyncUpdatedItemDtoSchema).optional(),
});

export type AdminAlfaCrmSyncReportDto = z.infer<typeof AdminAlfaCrmSyncReportDtoSchema>;

export const AdminAlfaCrmSyncParentLinksResponseDtoSchema = z.object({
  ok: z.boolean(),
  customersProcessed: z.number().int().nonnegative(),
  parentsUpserted: z.number().int().nonnegative(),
  linksUpserted: z.number().int().nonnegative(),
  counts: z
    .object({
      customersFetched: z.number().int().nonnegative(),
      customersSkippedMissingId: z.number().int().nonnegative(),
      customersSkippedInvalidName: z.number().int().nonnegative(),
      parentCacheHits: z.number().int().nonnegative(),
      parentsReusedExisting: z.number().int().nonnegative(),
      parentKeyCollisions: z.number().int().nonnegative(),
      linksSkippedExisting: z.number().int().nonnegative(),
    })
    .optional(),
  message: z.string().optional(),
  rawStatus: z.number().int().optional(),
});

export type AdminAlfaCrmSyncParentLinksResponseDto = z.infer<
  typeof AdminAlfaCrmSyncParentLinksResponseDtoSchema
>;

// --- Admin: AlfaCRM sync people (teachers/students/customers) ---

export const AdminAlfaCrmSyncPeopleResponseDtoSchema = z.object({
  ok: z.boolean(),
  message: z.string().optional(),
  rawStatus: z
    .object({
      teachers: z.number().int(),
      customers: z.number().int(),
    })
    .optional(),
  fetched: z.object({
    teachers: z.number().int().nonnegative(),
    customers: z.number().int().nonnegative(),
  }),
  processed: z.object({
    teachers: z.number().int().nonnegative(),
    customers: z.number().int().nonnegative(),
  }),
  upserted: z.object({
    teachers: z.number().int().nonnegative(),
    students: z.number().int().nonnegative(),
  }),
  skipped: z
    .object({
      teachersMissingId: z.number().int().nonnegative(),
      customersMissingId: z.number().int().nonnegative(),
    })
    .optional(),
});

export type AdminAlfaCrmSyncPeopleResponseDto = z.infer<typeof AdminAlfaCrmSyncPeopleResponseDtoSchema>;
