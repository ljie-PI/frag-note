import { z } from 'zod';
import {
  answerArtifactSchema,
  citationLocatorSchema,
  relationObjectTypeSchema,
} from '@sui-note/domain';

export const searchQueryContractSchema = z.object({
  queryText: z.string(),
  queryType: answerArtifactSchema.shape.queryType,
});

export const searchResultContractSchema = z.object({
  objectId: z.string().uuid(),
  objectType: relationObjectTypeSchema,
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
