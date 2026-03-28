import { describe, expect, it } from 'vitest';
import {
  answerArtifactSchema,
  assetSchema,
  derivedObjectSchema,
  fragmentSchema,
  processingJobSchema,
  relationSchema,
} from '../index';
import { fragmentContractSchema } from '../../../contracts/src/fragments';
import { searchQueryContractSchema } from '../../../contracts/src/search';
import {
  seedAnswer,
  seedAsset,
  seedCandidate,
  seedDerivedArtifact,
  seedFragments,
  seedProcessingJob,
  seedRelation,
} from '../../../testing/src';

describe('answerArtifactSchema', () => {
  it('fits the canonical contracts and shared fixtures surface', () => {
    const answer = answerArtifactSchema.parse(seedAnswer);
    const candidate = derivedObjectSchema.parse(seedCandidate);
    const fragments = seedFragments.topicCluster.map((fragment) =>
      fragmentSchema.parse(fragment),
    );
    const asset = assetSchema.parse(seedAsset);
    const relation = relationSchema.parse(seedRelation);
    const job = processingJobSchema.parse(seedProcessingJob);
    const fragment = fragmentContractSchema.parse(seedFragments.topicCluster[0]);
    const query = searchQueryContractSchema.parse({
      queryText: answer.queryText,
      queryType: answer.queryType,
    });

    expect(fragment.fragmentId).toBe(seedFragments.topicCluster[0].fragmentId);
    expect(fragments).toHaveLength(3);
    expect(query.queryType).toBe('natural_language');
    expect(candidate.status).toBe('candidate');
    expect(asset.fragmentId).toBe(seedFragments.topicCluster[0].fragmentId);
    expect(seedDerivedArtifact.fragmentId).toBe(seedFragments.topicCluster[0].fragmentId);
    expect(relation.sourceObjectId).toBe(candidate.objectId);
    expect(job.fragmentId).toBe(seedFragments.topicCluster[0].fragmentId);
    expect(answer.retrievalBundle).toContain(seedFragments.topicCluster[0].fragmentId);
  });
});
