import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createTestUser } from './helpers/auth-helpers.ts';
import { createApiClient } from './helpers/api-helpers.ts';
import { TestLogger } from './setup/test-logger.ts';
import { TEST_ENV } from './setup/test-env.ts';

describe('E2E: Cross-Cutting Concerns', () => {
  let logger: TestLogger;

  beforeAll(() => { logger = new TestLogger(); });
  afterAll(() => { logger?.saveReport('tests/e2e/reports/cross-cutting.json'); });

  describe('authentication enforcement', () => {
    it('RLS returns empty for unauthenticated REST requests', async () => {
      logger.step('call REST without auth token');
      const res = await fetch(
        `${TEST_ENV.SUPABASE_URL}/rest/v1/fragments?select=*`,
        { headers: { apikey: TEST_ENV.SUPABASE_ANON_KEY } },
      );
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it('rejects Edge Function calls without valid token', async () => {
      logger.step('call Edge Function with invalid token');
      const res = await fetch(`${TEST_ENV.SUPABASE_URL}/functions/v1/capture-fragment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: TEST_ENV.SUPABASE_ANON_KEY,
          Authorization: 'Bearer invalid-token',
        },
        body: JSON.stringify({
          fragmentId: crypto.randomUUID(),
          sourceType: 'text',
          createdAt: new Date().toISOString(),
        }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('user data isolation', () => {
    it('user A cannot see user B fragments', async () => {
      logger.step('create user A');
      const userA = await createTestUser();
      const apiA = createApiClient(userA.accessToken);
      await apiA.createDeviceSession();

      logger.step('user A creates fragment');
      const fragmentId = crypto.randomUUID();
      await apiA.captureFragment({
        fragmentId,
        sourceType: 'text',
        rawTextOptional: 'Secret data from user A',
        titleOptional: 'User A private',
        createdAt: new Date().toISOString(),
      });

      logger.step('create user B');
      const userB = await createTestUser();
      const apiB = createApiClient(userB.accessToken);
      await apiB.createDeviceSession();

      logger.step('user B lists fragments — should be empty');
      const fragments = await apiB.listFragments() as unknown[];
      expect(fragments.length).toBe(0);

      logger.step('user B tries to get user A fragment directly');
      const stolen = await apiB.getFragment(fragmentId);
      expect(stolen).toBeNull();
    });
  });

  describe('concurrent operations', () => {
    it('handles 5 concurrent fragment creations', async () => {
      logger.step('create user for concurrency test');
      const user = await createTestUser();
      const api = createApiClient(user.accessToken);
      await api.createDeviceSession();

      logger.step('create 5 fragments concurrently');
      const fragmentIds = Array.from({ length: 5 }, () => crypto.randomUUID());
      await Promise.all(
        fragmentIds.map((fid, i) =>
          api.captureFragment({
            fragmentId: fid,
            sourceType: 'text',
            rawTextOptional: `Concurrent fragment ${i + 1}`,
            createdAt: new Date().toISOString(),
          }),
        ),
      );

      logger.step('verify all 5 fragments exist');
      const fragments = await api.listFragments() as unknown[];
      expect(fragments.length).toBe(5);

      logger.step('verify all processing jobs created');
      let totalJobs = 0;
      for (const fid of fragmentIds) {
        const jobs = await api.getProcessingJobs(fid) as unknown[];
        totalJobs += jobs.length;
      }
      expect(totalJobs).toBe(5);
    });
  });
});
