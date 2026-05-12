import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createApiClient } from './helpers/api-helpers.ts';
import { createTestUser } from './helpers/auth-helpers.ts';
import { TestLogger } from './setup/test-logger.ts';

describe('E2E: Processing Pipeline', () => {
  let api: ReturnType<typeof createApiClient>;
  let logger: TestLogger;

  beforeAll(async () => {
    logger = new TestLogger();
    const user = await createTestUser();
    api = createApiClient(user.accessToken);
    await api.createDeviceSession();
  });

  afterAll(() => {
    logger?.saveReport('tests/e2e/reports/processing.json');
  });

  it('creates a fragment and verifies processing job is queued', async () => {
    const fragmentId = crypto.randomUUID();
    logger.step('capture fragment for processing test');

    await api.captureFragment({
      fragmentId,
      sourceType: 'text',
      rawTextOptional:
        'Machine learning research about neural networks and deep learning models',
      titleOptional: 'ML Research',
      createdAt: new Date().toISOString(),
    });

    logger.step('verify processing job');
    const jobs = await api.getProcessingJobs(fragmentId);
    expect(jobs.length).toBeGreaterThanOrEqual(1);
    expect(jobs[0].job_type).toBe('understanding');
  });

  it('creates multiple related fragments and verifies all stored', async () => {
    logger.step('create 3 related fragments');

    const fragments: string[] = [];
    for (let i = 0; i < 3; i++) {
      const fragmentId = crypto.randomUUID();
      await api.captureFragment({
        fragmentId,
        sourceType: 'text',
        rawTextOptional: `OCR technology ${i + 1}: optical character recognition converts images to searchable text using deep learning`,
        titleOptional: `OCR Note ${i + 1}`,
        createdAt: new Date().toISOString(),
      });
      fragments.push(fragmentId);
    }

    logger.step('verify all fragments created', { count: fragments.length });
    for (const fid of fragments) {
      const fragment = await api.getFragment(fid);
      expect(fragment).not.toBeNull();
    }

    logger.step('verify processing jobs for all fragments');
    for (const fid of fragments) {
      const jobs = await api.getProcessingJobs(fid);
      expect(jobs.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('verifies user data isolation', async () => {
    logger.step('create second user');
    const user2 = await createTestUser();
    const api2 = createApiClient(user2.accessToken);
    await api2.createDeviceSession();

    logger.step('user2 lists fragments');
    const fragments = await api2.listFragments();
    expect(fragments.length).toBe(0);

    logger.step('user isolation verified');
  });
});
