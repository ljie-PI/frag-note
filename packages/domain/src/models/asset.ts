import { z } from 'zod';

export const assetSchema = z.object({
  assetId: z.string().uuid(),
  fragmentId: z.string().uuid(),
  assetType: z.enum(['original', 'preview', 'attachment']),
  mimeType: z.string(),
  storagePath: z.object({
    bucket: z.string(),
    key: z.string(),
  }),
  fileNameOptional: z.string().nullable().optional(),
  checksum: z.string().nullable(),
  byteSize: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export type Asset = z.infer<typeof assetSchema>;
