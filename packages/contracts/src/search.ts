import { z } from 'zod';

export const searchQueryContractSchema = z.object({
  queryText: z.string(),
  queryType: z.enum(['keyword', 'natural_language']),
});

export const searchResultContractSchema = z.object({
  objectId: z.string().uuid(),
  objectType: z.enum(['fragment', 'artifact', 'derived_object', 'answer']),
  score: z.number(),
  citations: z.array(
    z.object({
      fragmentId: z.string().uuid(),
      locator: z.object({
        kind: z.enum([
          'text_span',
          'pdf_page',
          'transcript_range',
          'image_region',
        ]),
        value: z.string(),
      }),
    }),
  ),
});

export type SearchQueryContract = z.infer<typeof searchQueryContractSchema>;
export type SearchResultContract = z.infer<typeof searchResultContractSchema>;
