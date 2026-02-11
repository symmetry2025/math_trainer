import { z } from 'zod';
import { OutboxStatusSchema } from '../enums';

const OutboxStatusQuerySchema = z.preprocess(
  (v) => (typeof v === 'string' ? v.toLowerCase() : v),
  OutboxStatusSchema,
);

export const AdminOutboxListQuerySchema = z.object({
  status: OutboxStatusQuerySchema.optional(),
  kind: z.string().optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().optional(),
});

export type AdminOutboxListQueryDto = z.infer<typeof AdminOutboxListQuerySchema>;

export const AdminOutboxEntrySchema = z.object({
  id: z.string(),
  kind: z.string(),
  payload: z.any(),
  status: OutboxStatusSchema,
  attempts: z.number(),
  nextAttemptAt: z.string().datetime(),
  leaseUntil: z.string().datetime().nullable(),
  processingStartedAt: z.string().datetime().nullable(),
  lastError: z.string().nullable(),
  lastErrorCategory: z.string().nullable(),
  lastAttemptAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AdminOutboxEntryDto = z.infer<typeof AdminOutboxEntrySchema>;

export const AdminOutboxListResponseSchema = z.object({
  entries: z.array(AdminOutboxEntrySchema),
  nextCursor: z.string().optional(),
});

export type AdminOutboxListResponseDto = z.infer<typeof AdminOutboxListResponseSchema>;
