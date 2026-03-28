import { describe, expect, it } from 'vitest';
import { runWorker } from '../worker.js';

describe('runWorker', () => {
  it('fails fast until the worker loop is implemented', async () => {
    await expect(runWorker()).rejects.toThrow(
      'Worker loop is not implemented yet.',
    );
  });
});
