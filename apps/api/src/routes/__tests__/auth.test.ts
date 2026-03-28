import { describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';

describe('POST /v1/auth/device-session', () => {
  it('returns 201 with a new user and device session identity', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/device-session',
      payload: {},
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      userId: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ),
      deviceSessionId: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ),
      createdAt: expect.any(String),
    });

    await app.close();
  });
});
