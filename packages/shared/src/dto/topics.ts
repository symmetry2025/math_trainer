import { z } from "zod";

import { IsoDateTimeStringSchema } from "../ids";

const TopicIdSchema = z.string().min(1);

export const TopicDtoSchema = z.object({
  id: TopicIdSchema,
  title: z.string().min(1),
  gradeFrom: z.number().int().nullable().optional(),
  gradeTo: z.number().int().nullable().optional(),
  courseTag: z.string().nullable().optional(),
  createdAt: IsoDateTimeStringSchema,
  updatedAt: IsoDateTimeStringSchema,
});
export type TopicDto = z.infer<typeof TopicDtoSchema>;

export const CreateTopicRequestDtoSchema = z.object({
  title: z.string().min(1),
  gradeFrom: z.number().int().optional(),
  gradeTo: z.number().int().optional(),
  courseTag: z.string().optional(),
});
export type CreateTopicRequestDto = z.infer<typeof CreateTopicRequestDtoSchema>;

export const TopicsListResponseDtoSchema = z.object({
  items: z.array(TopicDtoSchema),
});
export type TopicsListResponseDto = z.infer<typeof TopicsListResponseDtoSchema>;

