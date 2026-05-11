import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createTestUser } from './helpers/auth-helpers.ts';
import { createApiClient } from './helpers/api-helpers.ts';
import { TestLogger } from './setup/test-logger.ts';

describe('E2E: Fragment List & Detail', () => {
  let api: ReturnType<typeof createApiClient>;
  let logger: TestLogger;

  beforeAll(async () => {
    logger = new TestLogger();
    const user = await createTestUser();
    api = createApiClient(user.accessToken);
    await api.createDeviceSession();
  });

  afterAll(() => { logger?.saveReport('tests/e2e/reports/fragments.json'); });

  it('returns empty list for new user', async () => {
    logger.step('list fragments for fresh user');
    const fragments = await api.listFragments();
    expect(fragments.length).toBe(0);
  });

  it('shows created fragment in list', async () => {
    const fragmentId = crypto.randomUUID();
    logger.step('create fragment', { fragmentId });
    await api.captureFragment({
      fragmentId,
      sourceType: 'text',
      rawTextOptional: 'Fragment list test',
      titleOptional: 'List Test',
      createdAt: new Date().toISOString(),
    });

    logger.step('verify fragment in list');
    const fragments = await api.listFragments();
    expect(fragments.length).toBe(1);
    expect(fragments[0].fragment_id).toBe(fragmentId);
  });

  it('gets fragment detail with correct fields', async () => {
    const fragmentId = crypto.randomUUID();
    logger.step('create detailed fragment', { fragmentId });
    await api.captureFragment({
      fragmentId,
      sourceType: 'text',
      rawTextOptional: 'Detailed content for inspection',
      titleOptional: 'Detail Test',
      createdAt: new Date().toISOString(),
    });

    logger.step('get fragment detail');
    const fragment = await api.getFragment(fragmentId);
    expect(fragment).not.toBeNull();
    expect(fragment.fragment_id).toBe(fragmentId);
    expect(fragment.source_type).toBe('text');
    expect(fragment.title_optional).toBe('Detail Test');
    expect(fragment.raw_text_optional).toBe('Detailed content for inspection');
    expect(fragment.status).toBe('processing');
    expect(fragment.origin_kind).toBe('user_capture');
  });

  it('supports different source types', async () => {
    logger.step('create link fragment');
    const linkId = crypto.randomUUID();
    await api.captureFragment({
      fragmentId: linkId,
      sourceType: 'link',
      rawTextOptional: 'https://example.com/article',
      titleOptional: 'Example Article',
      createdAt: new Date().toISOString(),
    });

    const linkFragment = await api.getFragment(linkId);
    expect(linkFragment.source_type).toBe('link');

    logger.step('create image fragment');
    const imageId = crypto.randomUUID();
    await api.captureFragment({
      fragmentId: imageId,
      sourceType: 'image',
      titleOptional: 'Test Image',
      createdAt: new Date().toISOString(),
    });

    const imageFragment = await api.getFragment(imageId);
    expect(imageFragment.source_type).toBe('image');
  });
});
