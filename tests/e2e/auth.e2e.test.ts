import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { createTestUser } from './helpers/auth-helpers.ts';
import { createApiClient } from './helpers/api-helpers.ts';
import { TestLogger } from './setup/test-logger.ts';
import { TEST_ENV } from './setup/test-env.ts';

describe('E2E: Authentication Flow', () => {
  let logger: TestLogger;

  beforeAll(() => { logger = new TestLogger(); });
  afterAll(() => { logger?.saveReport('tests/e2e/reports/auth.json'); });

  it('registers a new user and creates device session', async () => {
    logger.step('register new user');
    const user = await createTestUser();
    expect(user.userId).toBeTruthy();
    expect(user.accessToken).toBeTruthy();

    logger.step('create device session');
    const api = createApiClient(user.accessToken);
    const session = await api.createDeviceSession();
    expect(session.data.deviceSessionId).toBeTruthy();
    expect(session.data.userId).toBe(user.userId);
  });

  it('logs in an existing user', async () => {
    const email = `login-test-${randomUUID()}@e2e.local`;
    const password = 'test-password-123!';

    logger.step('register user first');
    await createTestUser(email, password);

    logger.step('login with same credentials');
    const res = await fetch(`${TEST_ENV.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: TEST_ENV.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.access_token).toBeTruthy();
  });

  it('rejects requests without valid token', async () => {
    logger.step('call Edge Function with invalid token');
    const res = await fetch(`${TEST_ENV.SUPABASE_URL}/functions/v1/device-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: TEST_ENV.SUPABASE_ANON_KEY,
        Authorization: 'Bearer invalid-token',
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('authenticated user can access their data', async () => {
    logger.step('create user and fragment');
    const user = await createTestUser();
    const api = createApiClient(user.accessToken);
    await api.createDeviceSession();

    await api.captureFragment({
      fragmentId: crypto.randomUUID(),
      sourceType: 'text',
      rawTextOptional: 'Auth test fragment',
      createdAt: new Date().toISOString(),
    });

    logger.step('verify user can list their fragments');
    const fragments = await api.listFragments();
    expect(fragments.length).toBe(1);
  });
});
