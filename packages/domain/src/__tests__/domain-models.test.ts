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
  seedAsset,
  seedDerivedArtifact,
  seedFragments,
  seedProcessingJob,
  seedRelation,
} from '@sui-note/testing';

describe('domain models', () => {
  it('exports the full fragment-first object family', () => {
    expect(fragmentSchema.shape.fragmentId).toBeDefined();
    expect(fragmentSchema.shape.createdAt).toBeDefined();
    expect(fragmentSchema.shape.deviceMetadata).toBeDefined();
    expect(assetSchema.shape.assetId).toBeDefined();
    expect(assetSchema.shape.storagePath).toBeDefined();
    expect(derivedArtifactSchema.shape.citations).toBeDefined();
    expect(derivedArtifactSchema.shape.providerMetadata).toBeDefined();
    expect(derivedObjectSchema.shape.supportingFragmentIds).toBeDefined();
    expect(processingJobSchema.shape.jobType).toBeDefined();
    expect(answerArtifactSchema.shape.retrievalBundle).toBeDefined();
    expect(relationSchema.shape.sourceObjectType).toBeDefined();
    expect(relationSchema.shape.createdAt).toBeDefined();
  });

  it('parses canonical relation contracts', () => {
    const relation = relationSchema.parse({
      relationId: '77777777-7777-4777-8777-777777777777',
      sourceObjectType: 'derived_object',
      sourceObjectId: '22222222-2222-4222-8222-222222222222',
      targetObjectType: 'fragment',
      targetObjectId: '11111111-1111-4111-8111-111111111111',
      relationType: 'supported_by',
      confidence: 0.92,
      explanation: 'Fragments support the candidate object.',
      algorithmVersion: 'v1',
      createdAt: '2026-03-28T10:00:00.000Z',
    });

    expect(relation.relationType).toBe('supported_by');
  });

  it('parses canonical shared asset and pipeline fixtures', () => {
    const fragments = seedFragments.topicCluster.map((fragment) =>
      fragmentSchema.parse(fragment),
    );
    const candidate = derivedObjectSchema.parse(seedCandidate);
    const asset = assetSchema.parse(seedAsset);
    const artifact = derivedArtifactSchema.parse(seedDerivedArtifact);
    const relation = relationSchema.parse(seedRelation);
    const job = processingJobSchema.parse(seedProcessingJob);

    expect(fragments).toHaveLength(3);
    expect(candidate.supportingFragmentIds).toContain(
      seedFragments.topicCluster[0].fragmentId,
    );
    expect(asset.storagePath.bucket).toBe('captures');
    expect(asset.fileNameOptional).toBe('ocr-research.png');
    expect(artifact.version).toBe('2026-03-28.1');
    expect(relation.createdAt).toBe('2026-03-28T10:06:00.000Z');
    expect(job.status).toBe('queued');
  });
});
