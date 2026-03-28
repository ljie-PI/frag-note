import { describe, expect, it } from 'vitest';
import { getTableName } from 'drizzle-orm';
import { fragmentsTable } from '../schema.js';

describe('fragmentsTable', () => {
  it('exports a drizzle table definition for fragments', () => {
    expect(fragmentsTable).toBeDefined();
    expect(getTableName(fragmentsTable)).toBe('fragments');
  });
});
