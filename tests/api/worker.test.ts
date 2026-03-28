import { afterEach, describe, expect, it, vi } from 'bun:test';
import { runWorker } from '../../apps/api/src/worker.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runWorker', () => {
  it('stays alive until it receives an abort signal', async () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const controller = new AbortController();
    const workerPromise = runWorker({ signal: controller.signal });

    expect(setIntervalSpy).toHaveBeenCalledOnce();

    let settled = false;
    workerPromise.finally(() => {
      settled = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(settled).toBe(false);

    controller.abort();

    await expect(workerPromise).resolves.toBeUndefined();
    expect(clearIntervalSpy).toHaveBeenCalledOnce();
  });
});
