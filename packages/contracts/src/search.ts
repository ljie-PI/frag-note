import { z } from 'zod';
import {
  answerArtifactSchema,
  citationLocatorSchema,
} from '@sui-note/domain';

export const searchResultObjectTypeSchema = z.enum([
  'fragment',
  'artifact',
  'derived_object',
  'answer',
]);

export const searchQueryContractSchema = z.object({
  queryText: z.string(),
  queryType: answerArtifactSchema.shape.queryType,
});

export const searchResultContractSchema = z.object({
  objectId: z.string().uuid(),
  objectType: searchResultObjectTypeSchema,
  score: z.number(),
  citations: z.array(
    z.object({
      fragmentId: z.string().uuid(),
      locator: citationLocatorSchema,
    }),
  ),
});

export type SearchQueryContract = z.infer<typeof searchQueryContractSchema>;
export type SearchResultContract = z.infer<typeof searchResultContractSchema>;
