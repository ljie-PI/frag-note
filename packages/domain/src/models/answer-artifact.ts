import { z } from 'zod';
import { citationSchema } from './derived-artifact';

export const answerArtifactSchema = z.object({
  answerId: z.string().uuid(),
  queryText: z.string(),
  queryType: z.enum(['keyword', 'natural_language']),
  answerFormat: z.enum(['summary', 'bullets', 'timeline', 'comparison']),
  retrievalBundle: z.array(z.string().uuid()),
  modelMetadata: z.record(z.string(), z.string()),
  citations: z.array(citationSchema),
});

export type AnswerArtifact = z.infer<typeof answerArtifactSchema>;
