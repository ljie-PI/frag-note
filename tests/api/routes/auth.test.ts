import { describe, expect, it } from 'bun:test';
import { buildApp } from '../../../apps/api/src/app.js';
import { createTestRuntime } from '../support/test-runtime.js';

describe('POST /v1/auth/device-session', () => {
  it('returns 201 with a new user and device session identity', async () => {
    const app = buildApp({ runtime: createTestRuntime() });

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

  it('rejects unexpected request body fields', async () => {
    const app = buildApp({ runtime: createTestRuntime() });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/device-session',
      payload: {
        unexpected: true,
      },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('rejects a null request body', async () => {
    const app = buildApp({ runtime: createTestRuntime() });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/device-session',
      headers: {
        'content-type': 'application/json',
      },
      payload: 'null',
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });
});
