import type {
  AnswerArtifact,
  Asset,
  DerivedArtifact,
  DerivedObject,
  Fragment,
  ProcessingJob,
  Relation,
} from '@sui-note/domain';
import type { DesktopApiClient } from '../features/sync/sync-service.ts';

type FragmentDetailResponse = Awaited<
  ReturnType<DesktopApiClient['getFragmentDetail']>
>;

type SearchInput = {
  queryText: string;
  queryType: 'keyword' | 'natural_language';
};

type AnswerPromotionResult = {
  fragmentId: string;
  originKind: 'answer_promotion';
  sourceAnswerId: string;
};

type QueryResult = Promise<{
  data: Array<Record<string, unknown>> | null;
  error: Error | null;
}>;

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3000';

export function createDesktopApiClient(
  baseUrl = DEFAULT_API_BASE_URL,
): DesktopApiClient & {
  listCandidates(): Promise<DerivedObject[]>;
  reviewCandidate(
    objectId: string,
    action: 'confirm' | 'dismiss' | 'postpone',
  ): Promise<DerivedObject>;
  search(input: SearchInput): Promise<AnswerArtifact>;
  saveAnswerAsFragment(
    answerId: string,
    input: {
      sourceQuery: string;
      citedFragmentIds: string[];
    },
  ): Promise<AnswerPromotionResult>;
} {
  const supabaseUrl = readEnv('VITE_SUPABASE_URL');
  const supabaseAnonKey = readEnv('VITE_SUPABASE_ANON_KEY');

  if (supabaseUrl && supabaseAnonKey) {
    return createSupabaseDesktopApiClient(supabaseUrl, supabaseAnonKey);
  }

  return createHttpDesktopApiClient(baseUrl);
}

function createHttpDesktopApiClient(baseUrl: string) {
  return {
    async ingestFragment(payload) {
      return requestJson(`${baseUrl}/v1/fragments`, {
        method: 'POST',
        body: JSON.stringify({
          sourceType: payload.sourceType,
          rawText: payload.rawText,
          titleOptional: payload.titleOptional,
        }),
      });
    },
    async getFragmentDetail(fragmentId) {
      return requestJson<FragmentDetailResponse>(
        `${baseUrl}/v1/fragments/${fragmentId}`,
      );
    },
    async listCandidates() {
      return requestJson(`${baseUrl}/v1/derived-objects/candidates`);
    },
    async reviewCandidate(objectId, action) {
      return requestJson(`${baseUrl}/v1/derived-objects/${objectId}/${action}`, {
        method: 'POST',
      });
    },
    async search(input) {
      return requestJson(`${baseUrl}/v1/search`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    async saveAnswerAsFragment(answerId, input) {
      return requestJson<AnswerPromotionResult>(
        `${baseUrl}/v1/answers/${answerId}/save-as-fragment`,
        {
          method: 'POST',
          body: JSON.stringify({
            originKind: 'answer_promotion',
            sourceQuery: input.sourceQuery,
            citedFragmentIds: input.citedFragmentIds,
          }),
        },
      );
    },
  };
}

function createSupabaseDesktopApiClient(url: string, anonKey: string) {
  const supabase = createBrowserSupabaseClient(url, anonKey);

  return {
    async ingestFragment(payload) {
      const now = new Date().toISOString();
      const fragmentId = createUuid();
      const userId = '99999999-9999-4999-8999-999999999999';
      const assetRows = extractAssetRowsFromRawText(
        fragmentId,
        userId,
        payload.rawText ?? null,
      );

      const fragmentInsert = await supabase.from('fragments').insert({
        fragment_id: fragmentId,
        user_id: userId,
        source_type: payload.sourceType,
        origin_kind: 'user_capture',
        title_optional: payload.titleOptional ?? null,
        raw_text_optional: payload.rawText ?? null,
        status: 'processing',
        device_metadata: {
          platform: 'desktop',
          captureMethod: 'supabase_direct',
          appVersion: '0.1.0',
          deviceName: 'desktop',
        },
        language_hint_optional: 'en',
        created_at: now,
        updated_at: now,
      });
      throwIfError(fragmentInsert.error);

      if (assetRows.length > 0) {
        const assetInsert = await supabase.from('assets').insert(assetRows);
        throwIfError(assetInsert.error);
      }

      const jobInsert = await supabase.from('processing_jobs').insert({
        job_id: createUuid(),
        fragment_id: fragmentId,
        user_id: userId,
        job_type: inferPrimaryJobType(payload.sourceType),
        status: 'queued',
        attempt_count: 0,
        provider: 'desktop-client',
        payload: {
          sourceType: payload.sourceType,
        },
        error_code: null,
        error_message: null,
        started_at: null,
        completed_at: null,
        created_at: now,
        updated_at: now,
      });
      throwIfError(jobInsert.error);

      return {
        fragmentId,
        status: 'processing' as const,
      };
    },
    async getFragmentDetail(fragmentId) {
      const [fragmentResponse, assetsResponse, artifactsResponse, relationsResponse, jobsResponse] =
        await Promise.all([
          supabase.from('fragments').select('*').eq('fragment_id', fragmentId).limit(1),
          supabase.from('assets').select('*').eq('fragment_id', fragmentId),
          supabase.from('derived_artifacts').select('*').eq('fragment_id', fragmentId),
          supabase
            .from('relations')
            .select('*')
            .or(`source_object_id.eq.${fragmentId},target_object_id.eq.${fragmentId}`),
          supabase.from('processing_jobs').select('*').eq('fragment_id', fragmentId),
        ]);

      throwIfError(fragmentResponse.error);
      throwIfError(assetsResponse.error);
      throwIfError(artifactsResponse.error);
      throwIfError(relationsResponse.error);
      throwIfError(jobsResponse.error);

      const fragmentRow = fragmentResponse.data?.[0];
      if (!fragmentRow) {
        throw new Error(`Fragment ${fragmentId} was not found`);
      }

      return {
        fragment: mapFragmentRow(fragmentRow),
        assets: (assetsResponse.data ?? []).map((row) => mapAssetRow(row)),
        derivedArtifacts: (artifactsResponse.data ?? []).map((row) =>
          mapDerivedArtifactRow(row),
        ),
        relatedFragments: (relationsResponse.data ?? []).map((row) =>
          mapRelationRow(row),
        ),
        processingJobs: (jobsResponse.data ?? []).map((row) =>
          mapProcessingJobRow(row),
        ),
      };
    },
    async listCandidates() {
      const response = await supabase
        .from('derived_objects')
        .select('*')
        .in('status', ['candidate', 'dismissed', 'postponed'])
        .order('updated_at', { ascending: false });
      throwIfError(response.error);
      return (response.data ?? []).map((row) => mapDerivedObjectRow(row));
    },
    async reviewCandidate(objectId, action) {
      const response = await supabase
        .from('derived_objects')
        .update({
          status:
            action === 'confirm'
              ? 'confirmed'
              : action === 'dismiss'
                ? 'dismissed'
                : 'postponed',
          updated_at: new Date().toISOString(),
        })
        .eq('object_id', objectId)
        .select('*')
        .limit(1);
      throwIfError(response.error);

      const candidate = response.data?.[0];
      if (!candidate) {
        throw new Error(`Derived object ${objectId} was not found`);
      }
      return mapDerivedObjectRow(candidate);
    },
    async search(input) {
      const response = await supabase.functions.invoke('search-query', {
        body: input,
      });
      throwIfError(response.error);
      return response.data as AnswerArtifact;
    },
    async saveAnswerAsFragment(answerId, input) {
      const response = await supabase.functions.invoke('promote-answer', {
        body: {
          answerId,
          originKind: 'answer_promotion',
          sourceQuery: input.sourceQuery,
          citedFragmentIds: input.citedFragmentIds,
        },
      });
      throwIfError(response.error);
      return response.data as AnswerPromotionResult;
    },
  };
}

function createBrowserSupabaseClient(url: string, anonKey: string) {
  const headers = {
    apikey: anonKey,
    authorization: `Bearer ${anonKey}`,
  };

  return {
    from(table: string) {
      return {
        select(columns = '*') {
          return createSelectBuilder(url, table, headers, columns);
        },
        insert(body: Record<string, unknown> | Array<Record<string, unknown>>) {
          return createMutationBuilder(url, table, headers, 'POST', body);
        },
        update(body: Record<string, unknown>) {
          return createMutationBuilder(url, table, headers, 'PATCH', body);
        },
      };
    },
    functions: {
      async invoke(name: string, options: { body: unknown }) {
        try {
          const response = await fetch(`${url}/functions/v1/${name}`, {
            method: 'POST',
            headers: {
              ...headers,
              'content-type': 'application/json',
            },
            body: JSON.stringify(options.body),
          });

          if (!response.ok) {
            throw new Error(await response.text());
          }

          return { data: await response.json(), error: null };
        } catch (error) {
          return { data: null, error: normalizeError(error) };
        }
      },
    },
  };
}

function createSelectBuilder(
  url: string,
  table: string,
  headers: Record<string, string>,
  columns: string,
) {
  const search = new URLSearchParams();
  search.set('select', columns);

  const execute = async () => {
    try {
      const response = await fetch(
        `${url}/rest/v1/${table}?${search.toString()}`,
        { headers },
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      return {
        data: Array.isArray(data) ? data : [],
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  };

  const builder = {
    then(onFulfilled: any, onRejected: any) {
      return execute().then(onFulfilled, onRejected);
    },
    catch(onRejected: any) {
      return execute().catch(onRejected);
    },
    finally(onFinally: any) {
      return execute().finally(onFinally);
    },
    eq(column: string, value: unknown) {
      search.set(column, `eq.${String(value)}`);
      return builder;
    },
    in(column: string, values: unknown[]) {
      search.set(column, `in.(${values.map((value) => String(value)).join(',')})`);
      return builder;
    },
    or(expression: string) {
      search.set('or', `(${expression})`);
      return builder;
    },
    order(column: string, options: { ascending?: boolean } = {}) {
      search.set('order', `${column}.${options.ascending === false ? 'desc' : 'asc'}`);
      return builder;
    },
    limit(count: number) {
      search.set('limit', String(count));
      return builder;
    },
  };

  return builder;
}

function createMutationBuilder(
  url: string,
  table: string,
  headers: Record<string, string>,
  method: 'POST' | 'PATCH',
  body: Record<string, unknown> | Array<Record<string, unknown>>,
) {
  const search = new URLSearchParams();
  let returnRepresentation = false;

  const execute = async () => {
    try {
      if (returnRepresentation) {
        search.set('select', '*');
      }

      const response = await fetch(
        `${url}/rest/v1/${table}${search.size > 0 ? `?${search.toString()}` : ''}`,
        {
          method,
          headers: {
            ...headers,
            'content-type': 'application/json',
            prefer: returnRepresentation ? 'return=representation' : 'return=minimal',
          },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      if (!returnRepresentation || response.status === 204) {
        return { data: [], error: null };
      }

      const data = await response.json();
      return {
        data: Array.isArray(data) ? data : [],
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  };

  const builder = {
    then(onFulfilled: any, onRejected: any) {
      return execute().then(onFulfilled, onRejected);
    },
    catch(onRejected: any) {
      return execute().catch(onRejected);
    },
    finally(onFinally: any) {
      return execute().finally(onFinally);
    },
    eq(column: string, value: unknown) {
      search.set(column, `eq.${String(value)}`);
      return builder;
    },
    select() {
      returnRepresentation = true;
      return builder;
    },
    limit(count: number) {
      search.set('limit', String(count));
      return builder;
    },
  };

  return builder;
}

async function requestJson<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function readEnv(name: string): string | null {
  const value = import.meta.env?.[name];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function inferPrimaryJobType(sourceType: Fragment['sourceType']) {
  switch (sourceType) {
    case 'image':
    case 'screenshot':
    case 'pdf':
      return 'ocr';
    case 'voice':
      return 'transcription';
    default:
      return 'understanding';
  }
}

function createUuid() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function extractAssetRowsFromRawText(
  fragmentId: string,
  userId: string,
  rawText: string | null,
) {
  if (!rawText) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawText) as {
      assets?: Array<{ fileName: string; localPath: string; mimeType: string }>;
    };

    if (!Array.isArray(parsed.assets)) {
      return [];
    }

    return parsed.assets.map((asset) => ({
      asset_id: createUuid(),
      fragment_id: fragmentId,
      user_id: userId,
      asset_type: 'attachment',
      mime_type: asset.mimeType,
      storage_bucket: 'captures-raw',
      storage_key: asset.localPath,
      file_name_optional: asset.fileName,
      checksum: null,
      byte_size: 0,
      created_at: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

function mapFragmentRow(row: Record<string, unknown>): Fragment {
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

function mapAssetRow(row: Record<string, unknown>): Asset {
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

function mapDerivedArtifactRow(row: Record<string, unknown>): DerivedArtifact {
  return {
    artifactId: String(row.artifact_id),
    fragmentId: String(row.fragment_id),
    artifactType: row.artifact_type as DerivedArtifact['artifactType'],
    version: String(row.version),
    content: (row.content as Record<string, unknown>) ?? {},
    providerMetadata:
      (row.provider_metadata as Record<string, string>) ?? {},
    createdAt: String(row.created_at),
    citations: (row.citations as DerivedArtifact['citations']) ?? [],
  };
}

function mapRelationRow(row: Record<string, unknown>): Relation {
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

function mapProcessingJobRow(row: Record<string, unknown>): ProcessingJob {
  return {
    jobId: String(row.job_id),
    fragmentId: String(row.fragment_id),
    jobType: String(row.job_type),
    status: row.status as ProcessingJob['status'],
    attemptCount: Number(row.attempt_count ?? 0),
    provider: String(row.provider ?? 'desktop-client'),
    errorCode: nullableString(row.error_code),
    errorMessage: nullableString(row.error_message),
    startedAt: nullableString(row.started_at),
    completedAt: nullableString(row.completed_at),
  };
}

function mapDerivedObjectRow(row: Record<string, unknown>): DerivedObject {
  return {
    objectId: String(row.object_id),
    objectType: row.object_type as DerivedObject['objectType'],
    status: row.status as DerivedObject['status'],
    title: String(row.title),
    summary: String(row.summary),
    keyEntities: (row.key_entities as string[]) ?? [],
    supportingFragmentIds: (row.supporting_fragment_ids as string[]) ?? [],
    citations: (row.citations as DerivedObject['citations']) ?? [],
    relationEdges: (row.relation_edges as string[]) ?? [],
    ruleVersion: String(row.rule_version),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function throwIfError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}
