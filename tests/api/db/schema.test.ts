import { describe, expect, it } from 'bun:test';
import { getTableName } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  answersTable,
  assetsTable,
  derivedArtifactsTable,
  derivedObjectsTable,
  deviceSessionsTable,
  fragmentsTable,
  processingJobsTable,
  relationsTable,
  usersTable,
} from '../../../apps/api/src/db/schema.js';

describe('schema exports', () => {
  it('exports drizzle table definitions for Supabase-first knowledge tables', () => {
    expect(fragmentsTable).toBeDefined();
    expect(getTableName(fragmentsTable)).toBe('fragments');
    expect(assetsTable).toBeDefined();
    expect(getTableName(assetsTable)).toBe('assets');
    expect(derivedArtifactsTable).toBeDefined();
    expect(getTableName(derivedArtifactsTable)).toBe('derived_artifacts');
    expect(relationsTable).toBeDefined();
    expect(getTableName(relationsTable)).toBe('relations');
    expect(processingJobsTable).toBeDefined();
    expect(getTableName(processingJobsTable)).toBe('processing_jobs');
    expect(answersTable).toBeDefined();
    expect(getTableName(answersTable)).toBe('answers');
    expect(derivedObjectsTable).toBeDefined();
    expect(getTableName(derivedObjectsTable)).toBe('derived_objects');
    expect(usersTable).toBeDefined();
    expect(getTableName(usersTable)).toBe('users');
    expect(deviceSessionsTable).toBeDefined();
    expect(getTableName(deviceSessionsTable)).toBe('device_sessions');
  });

  it('enforces the user-to-device-session foreign key', () => {
    expect(getTableConfig(deviceSessionsTable).foreignKeys).toHaveLength(1);
  });

  it('tracks lease fields on processing jobs for worker retries', () => {
    const columnNames = Object.keys(processingJobsTable);

    expect(columnNames).toContain('claimedAt');
    expect(columnNames).toContain('leaseExpiresAt');
  });
});
