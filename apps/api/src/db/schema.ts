import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const fragmentsTable = pgTable('fragments', {
  fragmentId: uuid('fragment_id').primaryKey(),
  userId: uuid('user_id').notNull(),
  sourceType: text('source_type').notNull(),
  originKind: text('origin_kind').notNull(),
  titleOptional: text('title_optional'),
  rawTextOptional: text('raw_text_optional'),
  status: text('status').notNull(),
  deviceMetadata: jsonb('device_metadata').notNull(),
  languageHintOptional: text('language_hint_optional'),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  }).notNull(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
    mode: 'string',
  }).notNull(),
});

export const assetsTable = pgTable('assets', {
  assetId: uuid('asset_id').primaryKey(),
  fragmentId: uuid('fragment_id').notNull(),
  userId: uuid('user_id').notNull(),
  assetType: text('asset_type').notNull(),
  mimeType: text('mime_type').notNull(),
  storageBucket: text('storage_bucket').notNull(),
  storageKey: text('storage_key').notNull(),
  fileNameOptional: text('file_name_optional'),
  checksum: text('checksum'),
  byteSize: integer('byte_size').notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  }).notNull(),
});

export const derivedArtifactsTable = pgTable('derived_artifacts', {
  artifactId: uuid('artifact_id').primaryKey(),
  fragmentId: uuid('fragment_id').notNull(),
  userId: uuid('user_id').notNull(),
  artifactType: text('artifact_type').notNull(),
  version: text('version').notNull(),
  content: jsonb('content').notNull(),
  providerMetadata: jsonb('provider_metadata').notNull(),
  citations: jsonb('citations').notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  }).notNull(),
});

export const relationsTable = pgTable('relations', {
  relationId: uuid('relation_id').primaryKey(),
  userId: uuid('user_id').notNull(),
  sourceObjectType: text('source_object_type').notNull(),
  sourceObjectId: uuid('source_object_id').notNull(),
  targetObjectType: text('target_object_type').notNull(),
  targetObjectId: uuid('target_object_id').notNull(),
  relationType: text('relation_type').notNull(),
  confidence: integer('confidence_basis_points').notNull(),
  explanation: text('explanation').notNull(),
  algorithmVersion: text('algorithm_version'),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  }).notNull(),
});

export const processingJobsTable = pgTable('processing_jobs', {
  jobId: uuid('job_id').primaryKey(),
  fragmentId: uuid('fragment_id').notNull(),
  userId: uuid('user_id').notNull(),
  jobType: text('job_type').notNull(),
  status: text('status').notNull(),
  attemptCount: integer('attempt_count').notNull(),
  provider: text('provider').notNull(),
  payload: jsonb('payload').notNull(),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at', {
    withTimezone: true,
    mode: 'string',
  }),
  completedAt: timestamp('completed_at', {
    withTimezone: true,
    mode: 'string',
  }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  }).notNull(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
    mode: 'string',
  }).notNull(),
});

export const answersTable = pgTable('answers', {
  answerId: uuid('answer_id').primaryKey(),
  userId: uuid('user_id').notNull(),
  queryText: text('query_text').notNull(),
  queryType: text('query_type').notNull(),
  answerBody: text('answer_body').notNull(),
  answerFormat: text('answer_format').notNull(),
  retrievalBundle: jsonb('retrieval_bundle').notNull(),
  modelMetadata: jsonb('model_metadata').notNull(),
  citations: jsonb('citations').notNull(),
  provenance: jsonb('provenance').notNull(),
  savedAsFragment: boolean('saved_as_fragment').notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  }).notNull(),
});

export * from './schema-auth.js';
export * from './schema-derived-objects.js';
