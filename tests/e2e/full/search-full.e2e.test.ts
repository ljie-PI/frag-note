import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { createTestUser } from '../helpers/auth-helpers.ts';
import { createApiClient, createServiceClient } from '../helpers/api-helpers.ts';
import { waitFor } from '../helpers/wait-helpers.ts';
import { startServices, type Services } from '../setup/start-services.ts';
import { TestLogger } from '../setup/test-logger.ts';

describe('E2E: Search & Answer', () => {
  let api: ReturnType<typeof createApiClient>;
  let service: ReturnType<typeof createServiceClient>;
  let services: Services;
  let logger: TestLogger;
  let userId: string;
  let readyFragmentId: string;

  beforeAll(async () => {
    logger = new TestLogger();
    services = await startServices();

    const user = await createTestUser();
    userId = user.userId;
    api = createApiClient(user.accessToken);
    service = createServiceClient();
    await api.createDeviceSession();

    // Create and wait for a fragment to become ready (search needs ready fragments)
    readyFragmentId = randomUUID();
    logger.step('create fragment for search tests', { readyFragmentId });
    await api.captureFragment({
      fragmentId: readyFragmentId,
      sourceType: 'text',
      rawTextOptional:
        'Quantum computing research explores qubits and quantum entanglement for faster computation',
      titleOptional: 'Quantum Computing Research',
      createdAt: new Date().toISOString(),
    });

    logger.step('wait for fragment to be ready');
    await waitFor(
      () => service.getFragment(readyFragmentId),
      (f) => f !== null && f.status === 'ready',
      { timeoutMs: 30_000, label: 'search fragment ready' },
    );
  }, 60_000);

  afterAll(() => {
    services?.stop();
    logger?.saveReport('tests/e2e/reports/search-full.json');
  });

  it('searches and returns matching answer', async () => {
    logger.step('search for quantum');
    const result = await api.searchViaApi('quantum computing');
    expect(result.status).toBe(200);

    const data = result.data as Record<string, unknown>;
    expect(data.answerId).toBeTruthy();
    expect(typeof data.answerBody).toBe('string');
    expect((data.answerBody as string).length).toBeGreaterThan(0);
    logger.step('search returned answer', { answerId: data.answerId });
  }, 15_000);

  it('returns an answer for any query (heuristic fallback)', async () => {
    logger.step('search for unrelated topic');
    const result = await api.searchViaApi('xyznonexistenttopic123');
    expect(result.status).toBe(200);

    const data = result.data as Record<string, unknown>;
    // Heuristic search may still return best-effort results; just verify shape
    expect(data.answerId).toBeTruthy();
    expect(typeof data.answerBody).toBe('string');
  }, 15_000);

  it('saves answer as fragment (answer promotion)', async () => {
    logger.step('search to get an answer');
    const searchResult = await api.searchViaApi('quantum');
    const answerId = (searchResult.data as Record<string, unknown>).answerId as string;
    expect(answerId).toBeTruthy();

    logger.step('save answer as fragment', { answerId });
    const saveResult = await api.saveAnswerAsFragmentViaApi(answerId);
    expect(saveResult.status).toBe(201);

    const saveData = saveResult.data as Record<string, unknown>;
    expect(saveData.fragmentId).toBeTruthy();
    expect(saveData.originKind).toBe('answer_promotion');
    expect(saveData.sourceAnswerId).toBe(answerId);

    logger.step('verify answer marked as saved');
    const answers = await service.getAnswers(userId);
    const saved = answers.find((a) => a.answer_id === answerId);
    expect(saved?.saved_as_fragment).toBe(true);
  }, 15_000);
});
