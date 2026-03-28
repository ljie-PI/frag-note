import { z } from 'zod';

export const sourceTypeSchema = z.enum([
  'text',
  'image',
  'link',
  'screenshot',
  'pdf',
  'voice',
  'answer',
]);

export const originKindSchema = z.enum([
  'user_capture',
  'answer_promotion',
]);

export const fragmentSchema = z.object({
  fragmentId: z.string().uuid(),
  userId: z.string().uuid(),
  sourceType: sourceTypeSchema,
  originKind: originKindSchema,
});

export type Fragment = z.infer<typeof fragmentSchema>;
