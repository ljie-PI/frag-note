import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const derivedObjectsTable = pgTable('derived_objects', {
  objectId: uuid('object_id').primaryKey(),
  userId: uuid('user_id').notNull(),
  objectType: text('object_type').notNull(),
  status: text('status').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  keyEntities: jsonb('key_entities').notNull(),
  ruleVersion: text('rule_version').notNull(),
  supportingFragmentCount: integer('supporting_fragment_count').notNull(),
  supportingFragmentIds: jsonb('supporting_fragment_ids').notNull(),
  citations: jsonb('citations').notNull(),
  relationEdges: jsonb('relation_edges').notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  }).notNull(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
    mode: 'string',
  }).notNull(),
});
