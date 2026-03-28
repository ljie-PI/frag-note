import { z } from 'zod';
import { citationSchema } from './citation';

export const queryTypeSchema = z.enum(['keyword', 'natural_language']);

export const answerArtifactSchema = z.object({
  answerId: z.string().uuid(),
  queryText: z.string(),
  queryType: queryTypeSchema,
  answerFormat: z.enum(['summary', 'bullets', 'timeline', 'comparison']),
  retrievalBundle: z.array(z.string().uuid()),
  modelMetadata: z.record(z.string(), z.string()),
  citations: z.array(citationSchema),
});

export type AnswerArtifact = z.infer<typeof answerArtifactSchema>;
