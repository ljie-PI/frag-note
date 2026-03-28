import { z } from 'zod';
import { citationSchema } from './citation.ts';
import { isoUtcTimestampSchema } from './primitives.ts';

export const derivedObjectSchema = z.strictObject({
  objectId: z.string().uuid(),
  objectType: z.enum(['topic', 'project', 'entity']),
  status: z.enum(['candidate', 'confirmed', 'dismissed', 'postponed']),
  title: z.string(),
  summary: z.string(),
  keyEntities: z.array(z.string()),
  supportingFragmentIds: z.array(z.string().uuid()),
  citations: z.array(citationSchema),
  relationEdges: z.array(z.string().uuid()),
  ruleVersion: z.string(),
  createdAt: isoUtcTimestampSchema,
  updatedAt: isoUtcTimestampSchema,
});

export type DerivedObject = z.infer<typeof derivedObjectSchema>;
