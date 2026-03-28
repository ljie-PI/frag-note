import { describe, expect, it } from 'bun:test';
import {
  citationSchema,
  derivedArtifactSchema,
} from '../../packages/domain/src/index.ts';

describe('derivedArtifactSchema', () => {
  it('accepts canonical artifact records with citations', () => {
    const parsed = derivedArtifactSchema.parse({
      artifactId: '44444444-4444-4444-8444-444444444444',
      fragmentId: '11111111-1111-4111-8111-111111111111',
      artifactType: 'summary',
      version: '2026-03-28.1',
      content: {
        text: 'OCR notes summarize screenshot extraction results.',
      },
      providerMetadata: {
        provider: 'openai',
        model: 'gpt-5',
      },
      createdAt: '2026-03-28T10:05:00.000Z',
      citations: [
        citationSchema.parse({
          fragmentId: '11111111-1111-4111-8111-111111111111',
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
    expect(parsed.providerMetadata.provider).toBe('openai');
    expect(parsed.citations).toHaveLength(1);
  });
});
