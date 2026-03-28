import { describe, expect, it } from 'bun:test';

describe('workspace packages', () => {
  it('loads the canonical package entrypoints', async () => {
    const domain = await import('@sui-note/domain');
    expect(domain).toBeDefined();
  });
});
