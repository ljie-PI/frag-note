import { describe, expect, it } from 'bun:test';
import { answerArtifactSchema } from '../../packages/domain/src/index.ts';
import { seedAnswer, seedFragments } from '@sui-note/testing';

describe('answerArtifactSchema', () => {
  it('captures canonical answer artifact fields', () => {
    const answer = answerArtifactSchema.parse(seedAnswer);

    expect(answer.queryType).toBe('natural_language');
    expect(answer.answerBody).toContain('OCR');
    expect(answer.citations[0]?.fragmentId).toBe(
      seedFragments.topicCluster[0].fragmentId,
    );
    expect(answer.retrievalBundle).toEqual(seedAnswer.retrievalBundle);
    expect(answer.provenance.citedFragmentIds).toEqual(
      seedAnswer.provenance.citedFragmentIds,
    );
    expect(answer.savedAsFragment).toBe(false);
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
