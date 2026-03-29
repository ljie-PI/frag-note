import { describe, expect, it } from 'bun:test';
import { createTestApp } from '../support/test-app.js';

describe('GET /health', () => {
  it('returns ok true', async () => {
    const app = createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });

    await app.close();
  });
});
