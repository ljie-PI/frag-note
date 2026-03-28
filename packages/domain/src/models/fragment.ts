import { z } from 'zod';
import { isoUtcTimestampSchema } from './primitives';

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

export const fragmentSchema = z.strictObject({
  fragmentId: z.string().uuid(),
  userId: z.string().uuid(),
  createdAt: isoUtcTimestampSchema,
  sourceType: sourceTypeSchema,
  originKind: originKindSchema,
  titleOptional: z.string().nullable().optional(),
  rawTextOptional: z.string().nullable().optional(),
  status: z.enum([
    'local_only',
    'queued_upload',
    'syncing',
    'processing',
    'partially_processed',
    'ready',
    'failed',
  ]),
  deviceMetadata: z.strictObject({
    platform: z.string(),
    captureMethod: z.string(),
    appVersion: z.string().optional(),
    deviceName: z.string().optional(),
  }),
  languageHintOptional: z.string().nullable().optional(),
});

export type Fragment = z.infer<typeof fragmentSchema>;
