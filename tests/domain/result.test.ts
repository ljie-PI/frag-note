import { describe, expect, it } from 'bun:test';
import { ok, err } from '../../packages/domain/src/result.ts';

describe('Result', () => {
  it('ok wraps data', () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(42);
  });

  it('err wraps error with code', () => {
    const result = err('not found', 'not_found');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('not found');
      expect(result.code).toBe('not_found');
    }
  });

  it('err defaults to internal code', () => {
    const result = err('something broke');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('internal');
    }
  });
});
