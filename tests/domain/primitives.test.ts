import { describe, expect, it } from 'bun:test';
import { isoUtcTimestampSchema } from '../../packages/domain/src/models/primitives';

describe('isoUtcTimestampSchema', () => {
  it('rejects impossible UTC timestamps even when the string shape is correct', () => {
    expect(() =>
      isoUtcTimestampSchema.parse('2026-99-99T99:99:99.999Z'),
    ).toThrow();
  });
});
