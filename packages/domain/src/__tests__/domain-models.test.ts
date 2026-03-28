import { describe, expect, it } from 'vitest';
import {
  answerArtifactSchema,
  derivedArtifactSchema,
  derivedObjectSchema,
  fragmentSchema,
  processingJobSchema,
  relationSchema,
} from '../index';

describe('domain models', () => {
  it('exports the full fragment-first object family', () => {
    expect(fragmentSchema.shape.fragmentId).toBeDefined();
    expect(derivedArtifactSchema.shape.citations).toBeDefined();
    expect(derivedObjectSchema.shape.supportingFragmentIds).toBeDefined();
    expect(processingJobSchema.shape.jobType).toBeDefined();
    expect(answerArtifactSchema.shape.retrievalBundle).toBeDefined();
    expect(relationSchema.shape.sourceObjectType).toBeDefined();
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
    });

    expect(relation.relationType).toBe('supported_by');
  });
});
