import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createTestUser } from './helpers/auth-helpers.ts';
import { createApiClient, createServiceClient } from './helpers/api-helpers.ts';
import { TestLogger } from './setup/test-logger.ts';

describe('E2E: Organization (Derived Objects Review)', () => {
  let api: ReturnType<typeof createApiClient>;
  let service: ReturnType<typeof createServiceClient>;
  let logger: TestLogger;
  let userId: string;

  beforeAll(async () => {
    logger = new TestLogger();
    const user = await createTestUser();
    userId = user.userId;
    api = createApiClient(user.accessToken);
    service = createServiceClient();
    await api.createDeviceSession();

    // Ensure user record exists for service-role inserts
    await service.insertUser(userId);
  });

  afterAll(() => { logger?.saveReport('tests/e2e/reports/organization.json'); });

  it('returns no candidates for new user', async () => {
    logger.step('check candidates for fresh user');
    const candidates = await api.getCandidates();
    expect(candidates.length).toBe(0);
  });

  it('shows inserted candidate in list', async () => {
    const objectId = crypto.randomUUID();
    const now = new Date().toISOString();
    logger.step('insert test candidate via service role', { objectId });

    await service.insertDerivedObject({
      object_id: objectId,
      user_id: userId,
      object_type: 'topic',
      status: 'candidate',
      title: 'E2E Test Topic',
      summary: 'A topic created for E2E testing.',
      key_entities: ['E2E', 'testing'],
      rule_version: 'e2e-test',
      supporting_fragment_count: 0,
      citations: [],
      relation_edges: [],
      created_at: now,
      updated_at: now,
    });

    logger.step('verify candidate in list');
    const candidates = await api.getCandidates();
    const found = candidates.find((c: Record<string, unknown>) => c.object_id === objectId);
    expect(found).toBeTruthy();
    expect(found.title).toBe('E2E Test Topic');
    expect(found.status).toBe('candidate');
  });

  it('confirms a candidate', async () => {
    const objectId = crypto.randomUUID();
    const now = new Date().toISOString();
    logger.step('insert candidate to confirm', { objectId });

    await service.insertDerivedObject({
      object_id: objectId,
      user_id: userId,
      object_type: 'entity',
      status: 'candidate',
      title: 'Confirm Test',
      summary: 'Will be confirmed.',
      key_entities: [],
      rule_version: 'e2e-test',
      supporting_fragment_count: 0,
      citations: [],
      relation_edges: [],
      created_at: now,
      updated_at: now,
    });

    logger.step('confirm candidate');
    const result = await api.reviewDerivedObject(objectId, 'confirm');
    expect(result.status).toBe(200);

    logger.step('verify status changed');
    const obj = await api.getDerivedObject(objectId);
    expect(obj.status).toBe('confirmed');
  });

  it('dismisses a candidate', async () => {
    const objectId = crypto.randomUUID();
    const now = new Date().toISOString();
    logger.step('insert candidate to dismiss', { objectId });

    await service.insertDerivedObject({
      object_id: objectId,
      user_id: userId,
      object_type: 'project',
      status: 'candidate',
      title: 'Dismiss Test',
      summary: 'Will be dismissed.',
      key_entities: [],
      rule_version: 'e2e-test',
      supporting_fragment_count: 0,
      citations: [],
      relation_edges: [],
      created_at: now,
      updated_at: now,
    });

    logger.step('dismiss candidate');
    await api.reviewDerivedObject(objectId, 'dismiss');

    const obj = await api.getDerivedObject(objectId);
    expect(obj.status).toBe('dismissed');
  });

  it('postpones a candidate', async () => {
    const objectId = crypto.randomUUID();
    const now = new Date().toISOString();
    logger.step('insert candidate to postpone', { objectId });

    await service.insertDerivedObject({
      object_id: objectId,
      user_id: userId,
      object_type: 'topic',
      status: 'candidate',
      title: 'Postpone Test',
      summary: 'Will be postponed.',
      key_entities: [],
      rule_version: 'e2e-test',
      supporting_fragment_count: 0,
      citations: [],
      relation_edges: [],
      created_at: now,
      updated_at: now,
    });

    logger.step('postpone candidate');
    await api.reviewDerivedObject(objectId, 'postpone');

    const obj = await api.getDerivedObject(objectId);
    expect(obj.status).toBe('postponed');
  });
});
