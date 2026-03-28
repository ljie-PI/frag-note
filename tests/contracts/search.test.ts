import { describe, expect, it } from 'bun:test';
import {
  searchQueryContractSchema,
  searchResultContractSchema,
} from '../../packages/contracts/src/search';
import {
  seedAnswer,
  seedCandidate,
  seedDerivedArtifact,
  seedFragments,
} from '@sui-note/testing';

describe('search contracts', () => {
  it('limits result object types to the search surface', () => {
    expect(searchResultContractSchema.shape.objectType.options).toEqual([
      'fragment',
      'artifact',
      'derived_object',
      'answer',
    ]);
  });

  it('accepts canonical query and result payloads', () => {
    const query = searchQueryContractSchema.parse({
      queryText: seedAnswer.queryText,
      queryType: seedAnswer.queryType,
    });

    const result = searchResultContractSchema.parse({
      objectId: seedCandidate.objectId,
      objectType: 'derived_object',
      score: 0.91,
      citations: [
        {
          fragmentId: seedFragments.topicCluster[0].fragmentId,
          locator: seedDerivedArtifact.citations[0].locator,
        },
      ],
    });

    expect(query.queryType).toBe('natural_language');
    expect(result.citations[0].fragmentId).toBe(
      seedFragments.topicCluster[0].fragmentId,
    );
  });

  it('rejects undeclared query and result fields', () => {
    expect(() =>
      searchQueryContractSchema.parse({
        queryText: seedAnswer.queryText,
        queryType: seedAnswer.queryType,
        debug: true,
      }),
    ).toThrow();

    expect(() =>
      searchResultContractSchema.parse({
        objectId: seedCandidate.objectId,
        objectType: 'derived_object',
        score: 0.91,
        citations: [
          {
            fragmentId: seedFragments.topicCluster[0].fragmentId,
            locator: seedDerivedArtifact.citations[0].locator,
            debug: true,
          },
        ],
      }),
    ).toThrow();
  });

  it('rejects unknown result object types', () => {
    expect(() =>
      searchResultContractSchema.parse({
        objectId: seedCandidate.objectId,
        objectType: 'project',
        score: 0.91,
        citations: [],
      }),
    ).toThrow();
  });
});
