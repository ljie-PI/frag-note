import { describe, expect, it } from 'vitest';
import { runWorker } from '../worker.js';

describe('runWorker', () => {
  it('stays alive until it receives an abort signal', async () => {
    const controller = new AbortController();
    const workerPromise = runWorker({ signal: controller.signal });

    let settled = false;
    workerPromise.finally(() => {
      settled = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(settled).toBe(false);

    controller.abort();

    await expect(workerPromise).resolves.toBeUndefined();
  });
});
