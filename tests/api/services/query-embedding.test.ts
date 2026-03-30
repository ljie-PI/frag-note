import { describe, expect, it } from 'bun:test';
import {
  buildDeterministicQueryEmbedding,
} from '../../../apps/api/src/services/search/query-embedding.ts';

describe('buildDeterministicQueryEmbedding', () => {
  it('returns a stable numeric vector from tokenized query text', () => {
    const vector = buildDeterministicQueryEmbedding(['ocr', 'search', 'ocr']);

    expect(vector).toEqual([3, 7, 5]);
  });
});
