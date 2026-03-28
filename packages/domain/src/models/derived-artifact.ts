import { z } from 'zod';
import { citationSchema } from './citation';
import { isoUtcTimestampSchema } from './primitives';

export const derivedArtifactSchema = z.strictObject({
  artifactId: z.string().uuid(),
  fragmentId: z.string().uuid(),
  artifactType: z.enum([
    'ocr',
    'transcript',
    'summary',
    'tags',
    'embedding',
    'answer',
  ]),
  version: z.string(),
  content: z.record(z.string(), z.unknown()),
  providerMetadata: z.record(z.string(), z.string()),
  createdAt: isoUtcTimestampSchema,
  citations: z.array(citationSchema),
});

export type DerivedArtifact = z.infer<typeof derivedArtifactSchema>;
