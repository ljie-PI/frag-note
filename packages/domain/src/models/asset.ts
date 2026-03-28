import { z } from 'zod';
import { isoUtcTimestampSchema } from './primitives.ts';

export const assetSchema = z.strictObject({
  assetId: z.string().uuid(),
  fragmentId: z.string().uuid(),
  assetType: z.enum(['original', 'preview', 'attachment']),
  mimeType: z.string(),
  storagePath: z.strictObject({
    bucket: z.string(),
    key: z.string(),
  }),
  fileNameOptional: z.string().nullable().optional(),
  checksum: z.string().nullable(),
  byteSize: z.number().int().nonnegative(),
  createdAt: isoUtcTimestampSchema,
});

export type Asset = z.infer<typeof assetSchema>;
