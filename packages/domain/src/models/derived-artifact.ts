import { z } from 'zod';

export const citationLocatorSchema = z.object({
  kind: z.enum(['text_span', 'pdf_page', 'transcript_range', 'image_region']),
  value: z.string(),
});

export const citationSchema = z.object({
  fragmentId: z.string().uuid(),
  artifactId: z.string().uuid().optional(),
  locator: citationLocatorSchema,
  supportPath: z.enum([
    'direct',
    'relation_expansion',
    'derived_object_expansion',
  ]),
});

export const derivedArtifactSchema = z.object({
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
  citations: z.array(citationSchema),
});

export type Citation = z.infer<typeof citationSchema>;
export type DerivedArtifact = z.infer<typeof derivedArtifactSchema>;
