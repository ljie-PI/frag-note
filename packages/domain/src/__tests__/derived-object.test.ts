import { describe, expect, it } from 'vitest';
import { derivedObjectSchema } from '../index';

describe('derivedObjectSchema', () => {
  it('tracks supporting fragments, citations, and relation edges', () => {
    const parsed = derivedObjectSchema.parse({
      objectId: '22222222-2222-4222-8222-222222222222',
      objectType: 'topic',
      status: 'candidate',
      title: 'OCR research',
      summary: 'Research notes about OCR tooling.',
      keyEntities: ['OCR', 'screenshots'],
      supportingFragmentIds: ['11111111-1111-1111-8111-111111111111'],
      citations: [
        {
          fragmentId: '11111111-1111-1111-8111-111111111111',
          locator: {
            kind: 'text_span',
            value: '0:42',
          },
          supportPath: 'derived_object_expansion',
        },
      ],
      relationEdges: ['55555555-5555-4555-8555-555555555555'],
      ruleVersion: 'v1',
    });

    expect(parsed.status).toBe('candidate');
    expect(parsed.supportingFragmentIds).toHaveLength(1);
  });
});
