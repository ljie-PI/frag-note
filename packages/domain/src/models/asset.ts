import { z } from 'zod';

export const assetSchema = z.object({
  assetId: z.string().uuid(),
  fragmentId: z.string().uuid(),
  assetType: z.enum(['original', 'preview', 'attachment']),
  mimeType: z.string(),
  storageKey: z.string(),
  checksum: z.string().nullable(),
  byteSize: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export type Asset = z.infer<typeof assetSchema>;
