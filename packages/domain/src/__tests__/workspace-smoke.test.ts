import { describe, expect, it } from 'vitest';

describe('workspace packages', () => {
  it('loads the canonical package entrypoints', async () => {
    const domain = await import('@sui-note/domain');
    expect(domain).toBeDefined();
  });
});
