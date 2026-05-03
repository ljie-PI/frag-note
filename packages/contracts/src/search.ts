import { z } from 'zod';
import {
  citationLocatorSchema,
  queryTypeSchema,
} from '@frag-note/domain';

export const searchResultObjectTypeSchema = z.enum([
  'fragment',
  'artifact',
  'derived_object',
  'answer',
]);

const searchCitationContractSchema = z.strictObject({
  fragmentId: z.string().uuid(),
  locator: citationLocatorSchema,
});

export const searchQueryContractSchema = z.strictObject({
  queryText: z.string(),
  queryType: queryTypeSchema,
});

export const searchResultContractSchema = z.strictObject({
  objectId: z.string().uuid(),
  objectType: searchResultObjectTypeSchema,
  score: z.number(),
  citations: z.array(searchCitationContractSchema),
});

export type SearchQueryContract = z.infer<typeof searchQueryContractSchema>;
export type SearchResultContract = z.infer<typeof searchResultContractSchema>;
