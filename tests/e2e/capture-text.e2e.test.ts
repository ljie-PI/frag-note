import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { createApiClient } from './helpers/api-helpers.ts';
import { createTestUser } from './helpers/auth-helpers.ts';
import { TestLogger } from './setup/test-logger.ts';

describe('E2E: Fragment Capture — Text', () => {
  let api: ReturnType<typeof createApiClient>;
  let logger: TestLogger;

  beforeAll(async () => {
    logger = new TestLogger();
    logger.step('create test user');
    const user = await createTestUser();
    api = createApiClient(user.accessToken);

    logger.step('create device session');
    const session = await api.createDeviceSession();
    expect([200, 201]).toContain(session.status);
  });

  afterAll(() => {
    logger?.saveReport('tests/e2e/reports/capture-text.json');
  });

  it('captures a text fragment via Edge Function', async () => {
    const fragmentId = randomUUID();
    logger.step('capture text fragment', { fragmentId });

    const result = await api.captureFragment({
      fragmentId,
      sourceType: 'text',
      rawTextOptional:
        'OCR research notes about screenshot processing and text extraction',
      titleOptional: 'OCR Research',
      createdAt: new Date().toISOString(),
    });

    expect(result.status).toBe(200);
    expect(result.data.fragmentId).toBe(fragmentId);

    logger.step('verify fragment in DB');
    const fragment = await api.getFragment(fragmentId);
    expect(fragment).not.toBeNull();
    expect(fragment.source_type).toBe('text');

    logger.step('verify processing job created');
    const jobs = await api.getProcessingJobs(fragmentId);
    expect(jobs.length).toBeGreaterThanOrEqual(1);
  });

  it('captures a fragment with title only', async () => {
    const fragmentId = randomUUID();
    logger.step('capture title-only fragment', { fragmentId });

    const result = await api.captureFragment({
      fragmentId,
      sourceType: 'text',
      titleOptional: 'Quick thought',
      createdAt: new Date().toISOString(),
    });

    expect(result.status).toBe(200);

    const fragment = await api.getFragment(fragmentId);
    expect(fragment.title_optional).toBe('Quick thought');
    expect(fragment.raw_text_optional).toBeNull();
  });

  it('lists fragments for authenticated user', async () => {
    logger.step('list fragments');
    const fragments = await api.listFragments();
    expect(fragments.length).toBeGreaterThanOrEqual(2);
    logger.step('found fragments', { count: fragments.length });
  });
});
