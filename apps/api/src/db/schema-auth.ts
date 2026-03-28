import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users', {
  userId: uuid('user_id').primaryKey(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  }).notNull(),
});

export const deviceSessionsTable = pgTable('device_sessions', {
  deviceSessionId: uuid('device_session_id').primaryKey(),
  userId: uuid('user_id').notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  }).notNull(),
});
