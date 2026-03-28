import { z } from 'zod';

const textSpanLocatorSchema = z.strictObject({
  kind: z.literal('text_span'),
  value: z
    .string()
    .regex(/^\d+:\d+$/, 'Expected `start:end` character offsets'),
});

const pdfPageLocatorSchema = z.strictObject({
  kind: z.literal('pdf_page'),
  value: z.string().regex(/^[1-9]\d*$/, 'Expected a 1-based PDF page number'),
});

const transcriptRangeLocatorSchema = z.strictObject({
  kind: z.literal('transcript_range'),
  value: z
    .string()
    .regex(/^\d+:\d+-\d+:\d+$/, 'Expected `start:end-start:end` transcript offsets'),
});

const imageRegionLocatorSchema = z.strictObject({
  kind: z.literal('image_region'),
  value: z
    .string()
    .regex(/^\d+,\d+,\d+,\d+$/, 'Expected `x,y,width,height` image coordinates'),
});

export const citationLocatorSchema = z.discriminatedUnion('kind', [
  textSpanLocatorSchema,
  pdfPageLocatorSchema,
  transcriptRangeLocatorSchema,
  imageRegionLocatorSchema,
]);

export const citationSchema = z.strictObject({
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
