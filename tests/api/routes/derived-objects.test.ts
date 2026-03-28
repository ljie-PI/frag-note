import { describe, expect, it } from 'bun:test';
import { buildApp } from '../../../apps/api/src/app.js';

describe('derived object review routes', () => {
  it('lists candidates and supports confirm, dismiss, and postpone flows', async () => {
    const app = buildApp();

    await app.inject({
      method: 'POST',
      url: '/v1/fragments',
      payload: {
        sourceType: 'text',
        rawText: 'OCR research notes with screenshot extraction details.',
        titleOptional: 'OCR research 1',
      },
    });
    await app.inject({
      method: 'POST',
      url: '/v1/fragments',
      payload: {
        sourceType: 'pdf',
        rawText: 'PDF discussing OCR screenshot extraction benchmarks.',
        titleOptional: 'OCR research 2',
      },
    });
    await app.inject({
      method: 'POST',
      url: '/v1/fragments',
      payload: {
        sourceType: 'link',
        rawText: 'https://example.com/ocr-benchmarks',
        titleOptional: 'OCR research 3',
      },
    });

    const listResponse = await app.inject({
      method: 'GET',
      url: '/v1/derived-objects/candidates',
    });

    expect(listResponse.statusCode).toBe(200);

    const candidates = listResponse.json() as Array<{ objectId: string; status: string }>;
    expect(candidates.length).toBeGreaterThan(0);

    const candidateId = candidates[0]!.objectId;

    const confirmResponse = await app.inject({
      method: 'POST',
      url: `/v1/derived-objects/${candidateId}/confirm`,
    });
    expect(confirmResponse.statusCode).toBe(200);
    expect(confirmResponse.json()).toEqual(
      expect.objectContaining({ status: 'confirmed' }),
    );

    const postponeResponse = await app.inject({
      method: 'POST',
      url: `/v1/derived-objects/${candidateId}/postpone`,
    });
    expect(postponeResponse.statusCode).toBe(200);
    expect(postponeResponse.json()).toEqual(
      expect.objectContaining({ status: 'postponed' }),
    );

    const dismissResponse = await app.inject({
      method: 'POST',
      url: `/v1/derived-objects/${candidateId}/dismiss`,
    });
    expect(dismissResponse.statusCode).toBe(200);
    expect(dismissResponse.json()).toEqual(
      expect.objectContaining({ status: 'dismissed' }),
    );

    await app.close();
  });
});
