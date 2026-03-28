import { describe, expect, it } from 'vitest';
import {
  answerArtifactSchema,
  assetSchema,
  derivedArtifactSchema,
  derivedObjectSchema,
  fragmentSchema,
  processingJobSchema,
  relationSchema,
} from '../index';
import {
  seedCandidate,
  seedAnswer,
  seedAsset,
  seedDerivedArtifact,
  seedFragments,
  seedProcessingJob,
  seedRelation,
} from '@sui-note/testing';

describe('domain models', () => {
  it('parses the canonical fragment-first object family', () => {
    const fragments = seedFragments.topicCluster.map((fragment) =>
      fragmentSchema.parse(fragment),
    );
    const candidate = derivedObjectSchema.parse(seedCandidate);
    const asset = assetSchema.parse(seedAsset);
    const artifact = derivedArtifactSchema.parse(seedDerivedArtifact);
    const relation = relationSchema.parse(seedRelation);
    const job = processingJobSchema.parse(seedProcessingJob);
    const answer = answerArtifactSchema.parse(seedAnswer);

    expect(fragments).toHaveLength(3);
    expect(candidate.supportingFragmentIds).toContain(
      seedFragments.topicCluster[0].fragmentId,
    );
    expect(asset.storagePath.bucket).toBe('captures');
    expect(asset.fileNameOptional).toBe('ocr-research.png');
    expect(artifact.version).toBe('2026-03-28.1');
    expect(relation.createdAt).toBe('2026-03-28T10:06:00.000Z');
    expect(job.status).toBe('queued');
    expect(answer.queryType).toBe('natural_language');
  });
});
