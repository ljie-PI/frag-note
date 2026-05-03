import type {
  AnswerArtifact,
  Asset,
  DerivedArtifact,
  DerivedObject,
  Fragment,
  ProcessingJob,
  Relation,
} from '@frag-note/domain';
import { invoke } from '@tauri-apps/api/core';
import { ensureSupabaseSession } from './auth-client.ts';
import type { DesktopApiClient } from '../features/sync/sync-service.ts';

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

export type ExtendedDesktopApiClient = DesktopApiClient & {
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
};

export function createDesktopApiClient(): ExtendedDesktopApiClient {
  const supabaseUrl = requiredEnv('VITE_SUPABASE_URL');
  const supabaseAnonKey = requiredEnv('VITE_SUPABASE_ANON_KEY');
  const apiBaseUrl = optionalEnv('VITE_API_BASE_URL');

  return createSupabaseDesktopApiClient(supabaseUrl, supabaseAnonKey, apiBaseUrl);
}

function createSupabaseDesktopApiClient(
  url: string,
  anonKey: string,
  apiBaseUrl: string | null,
) {
  const supabase = createBrowserSupabaseClient(url, anonKey);
  const normalizedApiBaseUrl = normalizeBaseUrl(apiBaseUrl);

  return {
    async ingestFragment(payload) {
      const session = await readSupabaseSessionSnapshot(url, anonKey);
      const now = new Date().toISOString();
      const fragmentId = createUuid();
      const userId = session.userId;
      const normalizedPayload = parseLocalCapturePayload(payload.rawText ?? null);
      const uploadedAssets = await uploadAssetsToSupabaseStorage(
        supabase,
        fragmentId,
        userId,
        normalizedPayload.assets,
      );
      const response = await supabase.functions.invoke('capture-fragment', {
        body: {
          fragmentId,
          sourceType: payload.sourceType,
          titleOptional: payload.titleOptional ?? null,
          rawTextOptional: normalizedPayload.rawText,
          createdAt: now,
          assetRows: uploadedAssets.map((asset) => asset.row),
        },
      });
      throwIfError(response.error);

      return response.data as {
        fragmentId: string;
        status: 'processing';
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
    async retryFragmentProcessing(fragmentId) {
      const response = await supabase.functions.invoke('retry-fragment', {
        body: {
          fragmentId,
        },
      });
      throwIfError(response.error);

      return response.data as {
        fragmentId: string;
        status: 'processing';
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
      const response = await supabase.functions.invoke('review-derived-object', {
        body: {
          objectId,
          action,
        },
      });
      throwIfError(response.error);
      return response.data as DerivedObject;
    },
    async search(input) {
      if (normalizedApiBaseUrl) {
        return invokeApiRoute<AnswerArtifact>(
          normalizedApiBaseUrl,
          '/v1/search',
          input,
          url,
          anonKey,
        );
      }

      const response = await supabase.functions.invoke('search-query', {
        body: input,
      });
      throwIfError(response.error);
      return response.data as AnswerArtifact;
    },
    async saveAnswerAsFragment(answerId, input) {
      if (normalizedApiBaseUrl) {
        return invokeApiRoute<AnswerPromotionResult>(
          normalizedApiBaseUrl,
          `/v1/answers/${answerId}/save-as-fragment`,
          {
            originKind: 'answer_promotion',
            sourceQuery: input.sourceQuery,
            citedFragmentIds: input.citedFragmentIds,
          },
          url,
          anonKey,
        );
      }

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
  const getHeaders = async () => {
    const session = await ensureSupabaseSession(url, anonKey);
    return {
      apikey: anonKey,
      authorization: `Bearer ${session?.accessToken ?? anonKey}`,
    };
  };

  return {
    from(table: string) {
      return {
        select(columns = '*') {
          return createSelectBuilder(url, table, getHeaders, columns);
        },
        insert(body: Record<string, unknown> | Array<Record<string, unknown>>) {
          return createMutationBuilder(url, table, getHeaders, 'POST', body);
        },
        update(body: Record<string, unknown>) {
          return createMutationBuilder(url, table, getHeaders, 'PATCH', body);
        },
      };
    },
    functions: {
      async invoke(name: string, options: { body: unknown }) {
        try {
          const headers = await getHeaders();
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
    storage: {
      from(bucket: string) {
        return {
          async upload(
            key: string,
            body: Uint8Array,
            options: { upsert?: boolean; contentType?: string } = {},
          ) {
            try {
              const headers = await getHeaders();
              const response = await fetch(
                `${url}/storage/v1/object/${bucket}/${encodePath(key)}`,
                {
                  method: 'POST',
                  headers: {
                    ...headers,
                    'content-type':
                      options.contentType ?? 'application/octet-stream',
                    'x-upsert': options.upsert ? 'true' : 'false',
                  },
                  body,
                },
              );

              if (!response.ok) {
                throw new Error(await response.text());
              }

              return { error: null };
            } catch (error) {
              return { error: normalizeError(error) };
            }
          },
        };
      },
    },
  };
}

function createSelectBuilder(
  url: string,
  table: string,
  getHeaders: () => Promise<Record<string, string>>,
  columns: string,
) {
  const search = new URLSearchParams();
  search.set('select', columns);

  const execute = async () => {
    try {
      const headers = await getHeaders();
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
  getHeaders: () => Promise<Record<string, string>>,
  method: 'POST' | 'PATCH',
  body: Record<string, unknown> | Array<Record<string, unknown>>,
) {
  const search = new URLSearchParams();
  let returnRepresentation = false;

  const execute = async () => {
    try {
      const headers = await getHeaders();
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

function readEnv(name: string): string | null {
  const value = import.meta.env?.[name];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

async function readSupabaseSessionSnapshot(url: string, anonKey: string) {
  const session = await ensureSupabaseSession(url, anonKey);

  if (!session?.accessToken) {
    throw new Error('Supabase access token is required');
  }

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${session.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to resolve Supabase user for desktop client');
  }

  const user = (await response.json()) as { id?: string };

  if (!user.id) {
    throw new Error('Resolved Supabase user did not include an id');
  }

  return {
    accessToken: session.accessToken,
    userId: user.id,
  };
}

function requiredEnv(name: string): string {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`${name} is required for the desktop Supabase client`);
  }

  return value;
}

function optionalEnv(name: string): string | null {
  return readEnv(name);
}

function normalizeBaseUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.endsWith('/') ? value.slice(0, -1) : value;
}

async function invokeApiRoute<T>(
  baseUrl: string,
  path: string,
  payload: unknown,
  supabaseUrl: string,
  supabaseAnonKey: string,
): Promise<T> {
  const session = await readSupabaseSessionSnapshot(supabaseUrl, supabaseAnonKey);
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${session.accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as T;
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

function parseLocalCapturePayload(rawText: string | null) {
  if (!rawText) {
    return {
      rawText: null,
      assets: [] as Array<{
        fileName: string;
        localPath?: string;
        mimeType: string;
        byteSize?: number;
        base64Data?: string;
      }>,
    };
  }

  try {
    const parsed = JSON.parse(rawText) as {
      rawText?: unknown;
      assets?: unknown;
    };

    if (!Array.isArray(parsed.assets)) {
      return {
        rawText,
        assets: [],
      };
    }

    return {
      rawText: typeof parsed.rawText === 'string' ? parsed.rawText : null,
      assets: parsed.assets.filter(
        (asset): asset is {
          fileName: string;
          localPath?: string;
          mimeType: string;
          byteSize?: number;
          base64Data?: string;
        } =>
          Boolean(
            asset &&
              typeof asset === 'object' &&
              typeof (asset as { fileName?: unknown }).fileName === 'string' &&
              typeof (asset as { mimeType?: unknown }).mimeType === 'string' &&
              (
                typeof (asset as { localPath?: unknown }).localPath === 'string' ||
                typeof (asset as { base64Data?: unknown }).base64Data === 'string'
              ),
          ),
      ),
    };
  } catch {
    return {
      rawText,
      assets: [],
    };
  }
}

async function uploadAssetsToSupabaseStorage(
  supabase: ReturnType<typeof createBrowserSupabaseClient>,
  fragmentId: string,
  userId: string,
  assets: Array<{
    fileName: string;
    localPath?: string;
    mimeType: string;
    byteSize?: number;
    base64Data?: string;
  }>,
) {
  return Promise.all(
    assets.map(async (asset) => {
      const bytes = await readLocalAssetBytes(asset);
      const storageKey = `${userId}/${fragmentId}/${asset.fileName}`;
      const upload = await supabase.storage.from('captures-raw').upload(
        storageKey,
        bytes,
        {
          upsert: true,
          contentType: asset.mimeType,
        },
      );
      throwIfError(upload.error);

      return {
        row: {
          asset_id: createUuid(),
          fragment_id: fragmentId,
          user_id: userId,
          asset_type: 'attachment',
          mime_type: asset.mimeType,
          storage_bucket: 'captures-raw',
          storage_key: storageKey,
          file_name_optional: asset.fileName,
          checksum: null,
          byte_size: asset.byteSize ?? bytes.byteLength,
          created_at: new Date().toISOString(),
        },
      };
    }),
  );
}

async function readLocalAssetBytes(asset: {
  fileName: string;
  localPath?: string;
  mimeType: string;
  base64Data?: string;
}) {
  if (typeof asset.base64Data === 'string' && asset.base64Data.length > 0) {
    return base64ToBytes(asset.base64Data);
  }

  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    if (!asset.localPath) {
      throw new Error(`localPath is required for Tauri asset ${asset.fileName}`);
    }
    const base64 = await invoke<string>('read_local_asset_base64', {
      localPath: asset.localPath,
    });
    return base64ToBytes(base64);
  }

  return new TextEncoder().encode(
    `placeholder asset for ${asset.fileName} (${asset.mimeType})`,
  );
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function encodePath(value: string) {
  return value
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
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
