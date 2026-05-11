import { randomUUID } from 'node:crypto';
import type {
  AnswerArtifact,
  Asset,
  Citation,
  DerivedArtifact,
  DerivedObject,
  Fragment,
  ProcessingJob,
  Relation,
} from '@frag-note/domain';

type JsonRecord = Record<string, unknown>;

export function buildFragmentRecord(input: {
  sourceType: Fragment['sourceType'];
  rawText?: string | null;
  titleOptional?: string | null;
  originKind?: Fragment['originKind'];
  userId: string;
}) {
  const now = new Date().toISOString();
  const fragment: Fragment = {
    fragmentId: randomUUID(),
    userId: input.userId,
    createdAt: now,
    sourceType: input.sourceType,
    originKind: input.originKind ?? 'user_capture',
    titleOptional: input.titleOptional ?? null,
    rawTextOptional: input.rawText ?? null,
    status: 'processing',
    deviceMetadata: {
      platform: 'desktop',
      captureMethod: 'supabase_direct',
      appVersion: '0.1.0',
      deviceName: 'client',
    },
    languageHintOptional: 'en',
  };

  return {
    fragment,
    row: {
      fragment_id: fragment.fragmentId,
      user_id: fragment.userId,
      source_type: fragment.sourceType,
      origin_kind: fragment.originKind,
      title_optional: fragment.titleOptional,
      raw_text_optional: fragment.rawTextOptional,
      status: fragment.status,
      device_metadata: fragment.deviceMetadata,
      language_hint_optional: fragment.languageHintOptional,
      created_at: fragment.createdAt,
      updated_at: fragment.createdAt,
    },
  };
}

export function buildProcessingJobRecord(fragment: Fragment, jobType: string) {
  const now = new Date().toISOString();
  const job: ProcessingJob = {
    jobId: randomUUID(),
    fragmentId: fragment.fragmentId,
    jobType,
    status: 'queued',
    attemptCount: 0,
    provider: 'supabase-worker',
    errorCode: null,
    errorMessage: null,
    claimedAt: null,
    leaseExpiresAt: null,
    startedAt: null,
    completedAt: null,
  };

  return {
    job,
    row: {
      job_id: job.jobId,
      fragment_id: job.fragmentId,
      user_id: fragment.userId,
      job_type: job.jobType,
      status: job.status,
      attempt_count: job.attemptCount,
      provider: job.provider,
      payload: { sourceType: fragment.sourceType },
      error_code: job.errorCode,
      error_message: job.errorMessage,
      claimed_at: job.claimedAt,
      lease_expires_at: job.leaseExpiresAt,
      started_at: job.startedAt,
      completed_at: job.completedAt,
      created_at: now,
      updated_at: now,
    },
  };
}

export function buildAssetRows(fragment: Fragment): Array<{
  asset: Asset;
  row: JsonRecord;
}> {
  const rawText = fragment.rawTextOptional;

  if (!rawText) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawText) as {
      assets?: Array<{
        fileName: string;
        localPath?: string;
        storageKey?: string;
        storageBucket?: string;
        mimeType: string;
        byteSize?: number;
      }>;
    };

    if (!Array.isArray(parsed.assets)) {
      return [];
    }

    return parsed.assets.map((pointer) => {
      const asset: Asset = {
        assetId: randomUUID(),
        fragmentId: fragment.fragmentId,
        assetType: 'attachment',
        mimeType: pointer.mimeType,
        storagePath: {
          bucket: pointer.storageBucket ?? 'captures-raw',
          key: pointer.storageKey ?? pointer.localPath ?? pointer.fileName,
        },
        fileNameOptional: pointer.fileName,
        checksum: null,
        byteSize: pointer.byteSize ?? 0,
        createdAt: new Date().toISOString(),
      };

      return {
        asset,
        row: {
          asset_id: asset.assetId,
          fragment_id: asset.fragmentId,
          user_id: fragment.userId,
          asset_type: asset.assetType,
          mime_type: asset.mimeType,
          storage_bucket: asset.storagePath.bucket,
          storage_key: asset.storagePath.key,
          file_name_optional: asset.fileNameOptional,
          checksum: asset.checksum,
          byte_size: asset.byteSize,
          created_at: asset.createdAt,
        },
      };
    });
  } catch {
    return [];
  }
}

export function buildDerivedArtifactRow(
  fragment: Fragment,
  artifact: DerivedArtifact,
): JsonRecord {
  return {
    artifact_id: artifact.artifactId,
    fragment_id: fragment.fragmentId,
    user_id: fragment.userId,
    artifact_type: artifact.artifactType,
    version: artifact.version,
    content: artifact.content,
    provider_metadata: artifact.providerMetadata,
    citations: artifact.citations,
    created_at: artifact.createdAt,
  };
}

export function buildRelationRow(userId: string, relation: Relation): JsonRecord {
  return {
    relation_id: relation.relationId,
    user_id: userId,
    source_object_type: relation.sourceObjectType,
    source_object_id: relation.sourceObjectId,
    target_object_type: relation.targetObjectType,
    target_object_id: relation.targetObjectId,
    relation_type: relation.relationType,
    confidence_basis_points: Math.round(relation.confidence * 10_000),
    explanation: relation.explanation,
    algorithm_version: relation.algorithmVersion ?? null,
    created_at: relation.createdAt,
  };
}

export function buildDerivedObjectRow(userId: string, object: DerivedObject, supportingFragmentCount = 0): JsonRecord {
  return {
    object_id: object.objectId,
    user_id: userId,
    object_type: object.objectType,
    status: object.status,
    title: object.title,
    summary: object.summary,
    key_entities: object.keyEntities,
    rule_version: object.ruleVersion,
    supporting_fragment_count: supportingFragmentCount,
    citations: object.citations,
    relation_edges: object.relationEdges,
    created_at: object.createdAt,
    updated_at: object.updatedAt,
  };
}

export function buildAnswerRow(userId: string, answer: AnswerArtifact): JsonRecord {
  return {
    answer_id: answer.answerId,
    user_id: userId,
    query_text: answer.queryText,
    query_type: answer.queryType,
    answer_body: answer.answerBody,
    answer_format: answer.answerFormat,
    retrieval_bundle: answer.retrievalBundle,
    model_metadata: answer.modelMetadata,
    citations: answer.citations,
    provenance: answer.provenance,
    saved_as_fragment: answer.savedAsFragment,
    created_at: answer.createdAt,
  };
}

export function mapFragmentRow(row: Record<string, unknown>): Fragment {
  return {
    fragmentId: String(row.fragment_id),
    userId: String(row.user_id),
    createdAt: String(row.created_at),
    sourceType: row.source_type as Fragment['sourceType'],
    originKind: row.origin_kind as Fragment['originKind'],
    titleOptional: nullableString(row.title_optional),
    rawTextOptional: nullableString(row.raw_text_optional),
    status: row.status as Fragment['status'],
    deviceMetadata: (row.device_metadata as Fragment['deviceMetadata']) ?? {
      platform: 'desktop',
      captureMethod: 'supabase_direct',
    },
    languageHintOptional: nullableString(row.language_hint_optional),
  };
}

export function mapAssetRow(row: Record<string, unknown>): Asset {
  return {
    assetId: String(row.asset_id),
    fragmentId: String(row.fragment_id),
    assetType: row.asset_type as Asset['assetType'],
    mimeType: String(row.mime_type),
    storagePath: {
      bucket: String(row.storage_bucket),
      key: String(row.storage_key),
    },
    fileNameOptional: nullableString(row.file_name_optional),
    checksum: nullableString(row.checksum),
    byteSize: Number(row.byte_size ?? 0),
    createdAt: String(row.created_at),
  };
}

export function mapDerivedArtifactRow(row: Record<string, unknown>): DerivedArtifact {
  return {
    artifactId: String(row.artifact_id),
    fragmentId: String(row.fragment_id),
    artifactType: row.artifact_type as DerivedArtifact['artifactType'],
    version: String(row.version),
    content: (row.content as Record<string, unknown>) ?? {},
    providerMetadata:
      (row.provider_metadata as Record<string, string>) ?? {},
    createdAt: String(row.created_at),
    citations: ((row.citations as Citation[]) ?? []) as Citation[],
  };
}

export function mapRelationRow(row: Record<string, unknown>): Relation {
  return {
    relationId: String(row.relation_id),
    sourceObjectType: row.source_object_type as Relation['sourceObjectType'],
    sourceObjectId: String(row.source_object_id),
    targetObjectType: row.target_object_type as Relation['targetObjectType'],
    targetObjectId: String(row.target_object_id),
    relationType: String(row.relation_type),
    confidence: Number(row.confidence_basis_points ?? 0) / 10_000,
    explanation: String(row.explanation ?? ''),
    createdAt: String(row.created_at),
    algorithmVersion:
      typeof row.algorithm_version === 'string'
        ? row.algorithm_version
        : undefined,
  };
}

export function mapProcessingJobRow(row: Record<string, unknown>): ProcessingJob {
  return {
    jobId: String(row.job_id),
    fragmentId: String(row.fragment_id),
    jobType: String(row.job_type),
    status: row.status as ProcessingJob['status'],
    attemptCount: Number(row.attempt_count ?? 0),
    provider: String(row.provider ?? 'supabase-worker'),
    errorCode: nullableString(row.error_code),
    errorMessage: nullableString(row.error_message),
    claimedAt: nullableString(row.claimed_at),
    leaseExpiresAt: nullableString(row.lease_expires_at),
    startedAt: nullableString(row.started_at),
    completedAt: nullableString(row.completed_at),
  };
}

export function mapDerivedObjectRow(row: Record<string, unknown>): DerivedObject {
  return {
    objectId: String(row.object_id),
    objectType: row.object_type as DerivedObject['objectType'],
    status: row.status as DerivedObject['status'],
    title: String(row.title),
    summary: String(row.summary),
    keyEntities: ((row.key_entities as string[]) ?? []) as string[],
    citations: ((row.citations as Citation[]) ?? []) as Citation[],
    relationEdges: ((row.relation_edges as string[]) ?? []) as string[],
    ruleVersion: String(row.rule_version),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapAnswerRow(row: Record<string, unknown>): AnswerArtifact {
  return {
    answerId: String(row.answer_id),
    queryText: String(row.query_text),
    queryType: row.query_type as AnswerArtifact['queryType'],
    answerBody: String(row.answer_body),
    answerFormat: row.answer_format as AnswerArtifact['answerFormat'],
    retrievalBundle:
      ((row.retrieval_bundle as string[]) ?? []) as string[],
    modelMetadata:
      (row.model_metadata as Record<string, string>) ?? {},
    citations: ((row.citations as Citation[]) ?? []) as Citation[],
    provenance: (row.provenance as AnswerArtifact['provenance']) ?? {
      sourceQuery: String(row.query_text),
      citedFragmentIds: [],
    },
    savedAsFragment: Boolean(row.saved_as_fragment),
    createdAt: String(row.created_at),
  };
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
