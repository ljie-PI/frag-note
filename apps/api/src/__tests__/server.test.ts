import { afterEach, describe, expect, it } from 'vitest';
import { startServer } from '../server.js';

const originalPort = process.env.PORT;

afterEach(() => {
  if (originalPort === undefined) {
    delete process.env.PORT;
    return;
  }

  process.env.PORT = originalPort;
});

describe('startServer', () => {
  it('rejects malformed PORT values before listen', async () => {
    process.env.PORT = '12.5';

    await expect(startServer()).rejects.toThrow('PORT must be a valid integer');
  });
});
