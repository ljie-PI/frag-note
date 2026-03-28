import { describe, expect, it } from 'vitest';
import { getTableName } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  deviceSessionsTable,
  fragmentsTable,
  usersTable,
} from '../schema.js';

describe('schema exports', () => {
  it('exports drizzle table definitions for fragments and auth tables', () => {
    expect(fragmentsTable).toBeDefined();
    expect(getTableName(fragmentsTable)).toBe('fragments');
    expect(usersTable).toBeDefined();
    expect(getTableName(usersTable)).toBe('users');
    expect(deviceSessionsTable).toBeDefined();
    expect(getTableName(deviceSessionsTable)).toBe('device_sessions');
  });

  it('enforces the user-to-device-session foreign key', () => {
    expect(getTableConfig(deviceSessionsTable).foreignKeys).toHaveLength(1);
  });
});
