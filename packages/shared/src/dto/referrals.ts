import { z } from 'zod';

import { IsoDateTimeStringSchema, UserIdSchema } from '../ids';

export const PromoterIdSchema = z.string().min(1);
export const PromoterCodeSchema = z.string().min(2).max(64);

export const PromoterProfileDtoSchema = z.object({
  id: PromoterIdSchema,
  userId: UserIdSchema,
  code: PromoterCodeSchema,
  displayName: z.string().min(1).optional(),
});
export type PromoterProfileDto = z.infer<typeof PromoterProfileDtoSchema>;

export const ReferralListItemForPromoterDtoSchema = z.object({
  userId: UserIdSchema,
  emailMasked: z.string().min(1).optional(),
  attributedAt: IsoDateTimeStringSchema,
  firstPaidAt: IsoDateTimeStringSchema.nullable(),
});
export type ReferralListItemForPromoterDto = z.infer<typeof ReferralListItemForPromoterDtoSchema>;

export const PromoterSummaryResponseDtoSchema = z.object({
  promoter: PromoterProfileDtoSchema,
  counts: z.object({
    registrations: z.number().int().min(0),
    paid: z.number().int().min(0),
  }),
  referrals: z.array(ReferralListItemForPromoterDtoSchema),
});
export type PromoterSummaryResponseDto = z.infer<typeof PromoterSummaryResponseDtoSchema>;

export const AdminPromoterListItemDtoSchema = z.object({
  promoter: PromoterProfileDtoSchema.extend({
    userEmail: z.string().email().optional(),
  }),
  counts: z.object({
    registrations: z.number().int().min(0),
    paid: z.number().int().min(0),
  }),
});
export type AdminPromoterListItemDto = z.infer<typeof AdminPromoterListItemDtoSchema>;

export const AdminPromotersListResponseDtoSchema = z.object({
  items: z.array(AdminPromoterListItemDtoSchema),
});
export type AdminPromotersListResponseDto = z.infer<typeof AdminPromotersListResponseDtoSchema>;

