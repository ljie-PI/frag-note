import { describe, expect, it } from 'vitest';
import { answerArtifactSchema } from '../index';
import { fragmentContractSchema } from '../../../contracts/src/fragments';
import { searchQueryContractSchema } from '../../../contracts/src/search';
import {
  seedAnswer,
  seedCandidate,
  seedFragments,
} from '../../../testing/src';

describe('answerArtifactSchema', () => {
  it('fits the canonical contracts and shared fixtures surface', () => {
    const answer = answerArtifactSchema.parse({
      answerId: seedAnswer.answerId,
      queryText: 'What is OCR useful for?',
      queryType: 'natural_language',
      answerFormat: 'summary',
      retrievalBundle: [seedFragments.topicCluster[0].fragmentId],
      modelMetadata: {
        provider: 'openai',
        model: 'gpt-5',
      },
      citations: [],
    });

    const fragment = fragmentContractSchema.parse({
      fragmentId: '11111111-1111-4111-8111-111111111111',
      userId: '99999999-9999-4999-8999-999999999999',
      sourceType: 'text',
      originKind: 'user_capture',
    });
    const query = searchQueryContractSchema.parse({
      queryText: answer.queryText,
      queryType: answer.queryType,
    });

    expect(fragment.fragmentId).toBe('11111111-1111-4111-8111-111111111111');
    expect(query.queryType).toBe('natural_language');
    expect(seedFragments.topicCluster).toHaveLength(3);
    expect(seedCandidate.status).toBe('candidate');
    expect(answer.retrievalBundle).toContain(seedFragments.topicCluster[0].fragmentId);
  });
});
