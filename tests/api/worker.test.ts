import { afterEach, describe, expect, it, vi } from 'bun:test';
import { runWorker } from '../../apps/api/src/worker.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runWorker', () => {
  it('delegates to the Supabase processing loop', async () => {
    const controller = new AbortController();
    const runLoop = vi.fn(async (signal?: AbortSignal) => {
      expect(signal).toBe(controller.signal);
    });

    await expect(
      runWorker({ signal: controller.signal, runLoop }),
    ).resolves.toBeUndefined();
    expect(runLoop).toHaveBeenCalledOnce();
  });
});
