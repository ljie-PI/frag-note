import { describe, expect, it } from 'vitest';
import { citationSchema, derivedArtifactSchema } from '../index';

describe('derivedArtifactSchema', () => {
  it('accepts canonical artifact records with citations', () => {
    const parsed = derivedArtifactSchema.parse({
      artifactId: '44444444-4444-4444-8444-444444444444',
      fragmentId: '11111111-1111-1111-8111-111111111111',
      artifactType: 'summary',
      citations: [
        citationSchema.parse({
          fragmentId: '11111111-1111-1111-8111-111111111111',
          artifactId: '44444444-4444-4444-8444-444444444444',
          locator: {
            kind: 'text_span',
            value: '0:42',
          },
          supportPath: 'direct',
        }),
      ],
    });

    expect(parsed.artifactType).toBe('summary');
    expect(parsed.citations).toHaveLength(1);
  });
});
