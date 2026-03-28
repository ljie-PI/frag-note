import { describe, expect, it } from 'vitest';
import { answerArtifactSchema } from '../index';
import { fragmentContractSchema } from '@sui-note/contracts/fragments';
import { searchQueryContractSchema } from '@sui-note/contracts/search';
import { seedAnswer, seedFragments } from '@sui-note/testing';

describe('answerArtifactSchema', () => {
  it('fits the answer and search contract surface', () => {
    const answer = answerArtifactSchema.parse(seedAnswer);
    const fragment = fragmentContractSchema.parse(seedFragments.topicCluster[0]);
    const query = searchQueryContractSchema.parse({
      queryText: answer.queryText,
      queryType: answer.queryType,
    });

    expect(fragment.fragmentId).toBe(seedFragments.topicCluster[0].fragmentId);
    expect(query.queryType).toBe('natural_language');
    expect(answer.retrievalBundle).toContain(seedFragments.topicCluster[0].fragmentId);
  });

  it('rejects non-uuid retrieval bundle entries', () => {
    expect(() =>
      answerArtifactSchema.parse({
        ...seedAnswer,
        retrievalBundle: ['not-a-uuid'],
      }),
    ).toThrow();
  });
});
