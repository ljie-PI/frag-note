import { integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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

export const derivedObjectFragmentsTable = pgTable(
  'derived_object_fragments',
  {
    objectId: uuid('object_id').notNull(),
    fragmentId: uuid('fragment_id').notNull(),
    userId: uuid('user_id').notNull(),
    addedAt: timestamp('added_at', { withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.objectId, table.fragmentId] })],
);
