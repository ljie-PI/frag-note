import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const derivedObjectsTable = pgTable('derived_objects', {
  objectId: uuid('object_id').primaryKey(),
  userId: uuid('user_id').notNull(),
  objectType: text('object_type').notNull(),
  status: text('status').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  ruleVersion: text('rule_version').notNull(),
  supportingFragmentCount: integer('supporting_fragment_count').notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  }).notNull(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
    mode: 'string',
  }).notNull(),
});
