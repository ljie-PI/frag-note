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

export type Citation = z.infer<typeof citationSchema>;
