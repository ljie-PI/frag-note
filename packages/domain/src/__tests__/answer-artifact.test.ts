import { describe, expect, it } from 'vitest';
import { answerArtifactSchema } from '../index.ts';
import { seedAnswer, seedFragments } from '@sui-note/testing';

describe('answerArtifactSchema', () => {
  it('captures canonical answer artifact fields', () => {
    const answer = answerArtifactSchema.parse(seedAnswer);

    expect(answer.queryType).toBe('natural_language');
    expect(answer.citations[0]?.fragmentId).toBe(
      seedFragments.topicCluster[0].fragmentId,
    );
    expect(answer.retrievalBundle).toEqual(seedAnswer.retrievalBundle);
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
