import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const fragmentsTable = pgTable('fragments', {
  fragmentId: uuid('fragment_id').primaryKey(),
  userId: uuid('user_id').notNull(),
  sourceType: text('source_type').notNull(),
  originKind: text('origin_kind').notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  }).notNull(),
});
