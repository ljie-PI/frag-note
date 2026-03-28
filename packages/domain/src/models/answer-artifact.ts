import { z } from 'zod';
import { citationSchema } from './citation.ts';
import { isoUtcTimestampSchema } from './primitives.ts';

export const queryTypeSchema = z.enum(['keyword', 'natural_language']);

export const answerArtifactSchema = z.strictObject({
  answerId: z.string().uuid(),
  queryText: z.string(),
  queryType: queryTypeSchema,
  answerBody: z.string(),
  answerFormat: z.enum(['summary', 'bullets', 'timeline', 'comparison']),
  retrievalBundle: z.array(z.string().uuid()),
  modelMetadata: z.record(z.string(), z.string()),
  citations: z.array(citationSchema),
  provenance: z.strictObject({
    sourceQuery: z.string(),
    citedFragmentIds: z.array(z.string().uuid()),
  }),
  savedAsFragment: z.boolean(),
  createdAt: isoUtcTimestampSchema,
});

export type AnswerArtifact = z.infer<typeof answerArtifactSchema>;
