import { describe, expect, it } from 'bun:test';
import { buildApp } from '../../../apps/api/src/app.js';
import { createTestRuntime } from '../support/test-runtime.js';

describe('POST /v1/fragments', () => {
  it('creates a fragment, processing artifacts, and related-fragment links', async () => {
    const app = buildApp({ runtime: createTestRuntime() });

    const firstResponse = await app.inject({
      method: 'POST',
      url: '/v1/fragments',
      payload: {
        sourceType: 'text',
        rawText: 'OCR helps convert screenshots into searchable text.',
        titleOptional: 'OCR note',
      },
    });

    const secondResponse = await app.inject({
      method: 'POST',
      url: '/v1/fragments',
      payload: {
        sourceType: 'link',
        rawText: 'https://example.com/ocr-overview',
        titleOptional: 'OCR overview',
      },
    });

    expect(firstResponse.statusCode).toBe(202);
    expect(secondResponse.statusCode).toBe(202);

    const firstFragmentId = firstResponse.json().fragmentId as string;
    const secondFragmentId = secondResponse.json().fragmentId as string;

    const detailResponse = await app.inject({
      method: 'GET',
      url: `/v1/fragments/${secondFragmentId}`,
    });

    expect(detailResponse.statusCode).toBe(200);

    const detail = detailResponse.json() as {
      fragment: { status: string };
      derivedArtifacts: Array<{ artifactType: string }>;
      relatedFragments: Array<{ targetObjectId: string; explanation: string }>;
    };

    expect(detail.fragment.status).toBe('ready');
    expect(detail.derivedArtifacts.map((artifact) => artifact.artifactType)).toEqual(
      expect.arrayContaining(['summary', 'tags', 'embedding']),
    );
    expect(detail.relatedFragments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetObjectId: firstFragmentId,
          explanation: expect.stringContaining('OCR'),
        }),
      ]),
    );

    await app.close();
  });
});
