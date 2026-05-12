import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { createTestUser } from '../helpers/auth-helpers.ts';
import { createApiClient, createServiceClient } from '../helpers/api-helpers.ts';
import { waitFor } from '../helpers/wait-helpers.ts';
import { startServices, type Services } from '../setup/start-services.ts';
import { TestLogger } from '../setup/test-logger.ts';

describe('E2E: Full Processing Pipeline', () => {
  let api: ReturnType<typeof createApiClient>;
  let service: ReturnType<typeof createServiceClient>;
  let services: Services;
  let logger: TestLogger;
  let userId: string;

  beforeAll(async () => {
    logger = new TestLogger();
    logger.step('start services');
    services = await startServices();

    logger.step('create test user');
    const user = await createTestUser();
    userId = user.userId;
    api = createApiClient(user.accessToken);
    service = createServiceClient();
    await api.createDeviceSession();
  }, 30_000);

  afterAll(() => {
    services?.stop();
    logger?.saveReport('tests/e2e/reports/pipeline-full.json');
  });

  it('processes text fragment end-to-end: artifacts generated', async () => {
    const fragmentId = randomUUID();
    logger.step('capture text fragment', { fragmentId });

    await api.captureFragment({
      fragmentId,
      sourceType: 'text',
      rawTextOptional:
        'Machine learning research about neural networks and deep learning optimization techniques',
      titleOptional: 'ML Research Notes',
      createdAt: new Date().toISOString(),
    });

    logger.step('wait for fragment to become ready');
    const readyFragment = await waitFor(
      () => service.getFragment(fragmentId),
      (f) => f !== null && f.status === 'ready',
      { timeoutMs: 30_000, label: 'fragment ready' },
    );
    expect(readyFragment.status).toBe('ready');

    logger.step('verify derived artifacts');
    const artifacts = await service.getArtifacts(fragmentId);
    const types = artifacts.map((a) => a.artifact_type);
    expect(types).toContain('summary');
    expect(types).toContain('tags');
    expect(types).toContain('embedding');
  }, 45_000);

  it('processing job lifecycle: queued -> completed', async () => {
    const fragmentId = randomUUID();
    logger.step('capture fragment for job lifecycle test');

    await api.captureFragment({
      fragmentId,
      sourceType: 'text',
      rawTextOptional: 'Testing processing job lifecycle tracking',
      createdAt: new Date().toISOString(),
    });

    logger.step('wait for job to complete');
    await waitFor(
      () => service.getJobs(fragmentId),
      (jobs) => jobs.length > 0 && jobs[0].status === 'completed',
      { timeoutMs: 30_000, label: 'job completed' },
    );

    const jobs = await service.getJobs(fragmentId);
    expect(jobs[0].status).toBe('completed');
    expect(Number(jobs[0].attempt_count)).toBeGreaterThanOrEqual(1);
    expect(jobs[0].completed_at).toBeTruthy();
  }, 45_000);

  it('discovers relations between fragments with shared keywords', async () => {
    logger.step('create 3 fragments with shared "optimization" keyword');
    const fragmentIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const fid = randomUUID();
      await api.captureFragment({
        fragmentId: fid,
        sourceType: 'text',
        rawTextOptional: `Optimization techniques ${i + 1}: gradient descent optimization for neural network training convergence`,
        titleOptional: `Optimization Note ${i + 1}`,
        createdAt: new Date().toISOString(),
      });
      fragmentIds.push(fid);
    }

    logger.step('wait for all fragments to be ready');
    for (const fid of fragmentIds) {
      await waitFor(
        () => service.getFragment(fid),
        (f) => f !== null && f.status === 'ready',
        { timeoutMs: 30_000, label: `fragment ${fid} ready` },
      );
    }

    logger.step('check relations exist');
    const lastFid = fragmentIds[fragmentIds.length - 1];
    const relations = await service.getRelations(lastFid);
    expect(relations.length).toBeGreaterThan(0);
    expect(relations[0].relation_type).toBe('related_topic');
  }, 120_000);

  it('generates topic candidates from related fragments', async () => {
    logger.step('check for topic candidates');
    const candidates = await service.getCandidates(userId);
    expect(candidates.length).toBeGreaterThan(0);

    const topics = candidates.filter((c) => c.object_type === 'topic');
    expect(topics.length).toBeGreaterThan(0);
    logger.step('verify topic candidate', { title: topics[0].title });
    expect(topics[0].status).toBe('candidate');
    expect(Number(topics[0].supporting_fragment_count)).toBeGreaterThan(0);
  }, 10_000);

  it('generates entity candidates from fragments mentioning same entity', async () => {
    logger.step('create 2 fragments mentioning "TensorFlow"');
    const fragmentIds: string[] = [];
    for (let i = 0; i < 2; i++) {
      const fid = randomUUID();
      await api.captureFragment({
        fragmentId: fid,
        sourceType: 'text',
        rawTextOptional: `TensorFlow framework ${i + 1}: using TensorFlow for building deep learning models and training pipelines`,
        titleOptional: `TensorFlow Note ${i + 1}`,
        createdAt: new Date().toISOString(),
      });
      fragmentIds.push(fid);
    }

    logger.step('wait for fragments to be ready');
    for (const fid of fragmentIds) {
      await waitFor(
        () => service.getFragment(fid),
        (f) => f !== null && f.status === 'ready',
        { timeoutMs: 30_000, label: `fragment ${fid} ready` },
      );
    }

    logger.step('check for entity candidates');
    const candidates = await service.getCandidates(userId);
    const entities = candidates.filter((c) => c.object_type === 'entity');
    expect(entities.length).toBeGreaterThan(0);
  }, 90_000);
});
