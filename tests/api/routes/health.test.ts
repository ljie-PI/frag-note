import { describe, expect, it } from 'bun:test';
import { buildApp } from '../../../apps/api/src/app.js';

describe('GET /health', () => {
  it('returns ok true', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });

    await app.close();
  });
});
