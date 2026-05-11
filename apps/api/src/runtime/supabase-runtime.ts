import { randomUUID } from 'node:crypto';
import type { AnswerArtifact, DerivedObject, Fragment, Relation } from '@frag-note/domain';
import type { CreateDeviceSessionResponse } from '@frag-note/contracts/auth';
import type { RequestAuthContext } from '../lib/request-auth.js';
import {
  buildDerivedArtifactsForFragmentAsync,
} from '../services/derived-artifacts.js';
import { extractFragmentSearchText } from '../services/fragment-content.js';
import { buildDeterministicQueryEmbedding } from '../services/search/query-embedding.js';
import { buildUpdateSuggestions } from '../services/object-candidates/update-suggestions.js';
import { tokenizeText } from '../services/text-utils.js';
import { runPipeline, type PipelineContext } from '../workers/processing-pipeline.js';
import { defaultPipeline } from '../workers/default-pipeline.js';
import { createSupabaseRuntimeClients } from '../lib/supabase.js';
import type { ApiRuntime, DerivedObjectUpdateSuggestion } from './runtime.js';
import {
  buildAnswerRow,
  buildAssetRows,
  buildDerivedObjectRow,
  buildFragmentRecord,
  buildProcessingJobRecord,
  mapAnswerRow,
  mapAssetRow,
  mapDerivedArtifactRow,
  mapDerivedObjectRow,
  mapFragmentRow,
  mapProcessingJobRow,
  mapRelationRow,
} from './supabase-records.js';

const JOB_LEASE_MS = 5 * 60 * 1000;
const JOB_HEARTBEAT_MS = 30 * 1000;
const MAX_JOB_ATTEMPTS = 3;

export function createSupabaseRuntime(): ApiRuntime {
  const { serviceClient } = createSupabaseRuntimeClients();
  const getDerivedObjectById = async (auth: RequestAuthContext, objectId: string) => {
    const { data, error } = await serviceClient
      .from('derived_objects')
      .select('*')
      .eq('user_id', auth.userId)
      .eq('object_id', objectId)
      .limit(1);

    if (error) {
      throw error;
    }

    return data?.[0] ? mapDerivedObjectRow(data[0]) : null;
  };

  const runtime: ApiRuntime = {
    mode: 'supabase',
    async createDeviceSession(auth) {
      const createdAt = new Date().toISOString();
      const deviceSessionId = randomUUID();

      await ensureUserRecord(serviceClient, auth.userId, createdAt);
      throwIfError(
        (
          await serviceClient.from('device_sessions').insert({
            device_session_id: deviceSessionId,
            user_id: auth.userId,
            created_at: createdAt,
          })
        ).error,
      );

      return {
        userId: auth.userId,
        deviceSessionId,
        createdAt,
      };
    },
    async listFragments(auth) {
      const { data, error } = await serviceClient
        .from('fragments')
        .select('*')
        .eq('user_id', auth.userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []).map((row) => mapFragmentRow(row));
    },
    async getFragmentDetail(auth, fragmentId) {
      const { data: fragmentRows, error: fragmentError } = await serviceClient
        .from('fragments')
        .select('*')
        .eq('user_id', auth.userId)
        .eq('fragment_id', fragmentId)
        .limit(1);

      if (fragmentError) {
        throw fragmentError;
      }

      const fragmentRow = fragmentRows?.[0];

      if (!fragmentRow) {
        return null;
      }

      const [assetResponse, artifactResponse, relationResponse, jobResponse] =
        await Promise.all([
          serviceClient.from('assets').select('*').eq('fragment_id', fragmentId),
          serviceClient
            .from('derived_artifacts')
            .select('*')
            .eq('fragment_id', fragmentId),
          serviceClient
            .from('relations')
            .select('*')
            .or(
              `source_object_id.eq.${fragmentId},target_object_id.eq.${fragmentId}`,
            ),
          serviceClient
            .from('processing_jobs')
            .select('*')
            .eq('fragment_id', fragmentId),
        ]);

      throwIfError(assetResponse.error);
      throwIfError(artifactResponse.error);
      throwIfError(relationResponse.error);
      throwIfError(jobResponse.error);

      return {
        fragment: mapFragmentRow(fragmentRow),
        assets: (assetResponse.data ?? []).map((row) => mapAssetRow(row)),
        derivedArtifacts: (artifactResponse.data ?? []).map((row) =>
          mapDerivedArtifactRow(row),
        ),
        relatedFragments: (relationResponse.data ?? []).map((row) =>
          mapRelationRow(row),
        ),
        processingJobs: (jobResponse.data ?? []).map((row) =>
          mapProcessingJobRow(row),
        ),
      };
    },
    async ingestFragment(auth, input) {
      const { fragment, row } = buildFragmentRecord({
        ...input,
        userId: auth.userId,
      });
      const assets = buildAssetRows(fragment);
      const jobType = inferPrimaryJobType(fragment.sourceType);
      const job = buildProcessingJobRecord(fragment, jobType);

      await ensureUserRecord(serviceClient, auth.userId, fragment.createdAt);

      throwIfError(
        (
          await serviceClient.from('fragments').insert(row).select('fragment_id').single()
        ).error,
      );

      if (assets.length > 0) {
        throwIfError(
          (await serviceClient.from('assets').insert(assets.map((asset) => asset.row))).error,
        );
      }

      throwIfError(
        (await serviceClient.from('processing_jobs').insert(job.row)).error,
      );

      return {
        fragmentId: fragment.fragmentId,
        status: 'processing',
      };
    },
    async retryFragmentProcessing(auth, fragmentId) {
      const fragmentResponse = await serviceClient
        .from('fragments')
        .select('*')
        .eq('user_id', auth.userId)
        .eq('fragment_id', fragmentId)
        .limit(1);

      throwIfError(fragmentResponse.error);

      const fragmentRow = fragmentResponse.data?.[0];

      if (!fragmentRow) {
        return null;
      }

      const fragment = mapFragmentRow(fragmentRow);
      const now = new Date().toISOString();
      const retryJob = buildProcessingJobRecord(
        {
          ...fragment,
          status: 'processing',
        },
        inferPrimaryJobType(fragment.sourceType),
      );

      throwIfError(
        (
          await serviceClient
            .from('fragments')
            .update({
              status: 'processing',
              updated_at: now,
            })
            .eq('user_id', auth.userId)
            .eq('fragment_id', fragmentId)
        ).error,
      );

      throwIfError(
        (
          await serviceClient
            .from('processing_jobs')
            .insert(retryJob.row)
        ).error,
      );

      return {
        fragmentId,
        status: 'processing',
      };
    },
    async listDerivedObjectCandidates(auth) {
      const { data, error } = await serviceClient
        .from('derived_objects')
        .select('*')
        .eq('user_id', auth.userId)
        .in('status', ['candidate', 'postponed', 'dismissed'])
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []).map((row) => mapDerivedObjectRow(row));
    },
    async getDerivedObjectDetail(auth, objectId) {
      return getDerivedObjectById(auth, objectId);
    },
    async reviewDerivedObject(auth, objectId, action) {
      const { data, error } = await serviceClient
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
        .eq('user_id', auth.userId)
        .eq('object_id', objectId)
        .select('*')
        .limit(1);

      if (error) {
        throw error;
      }

      return data?.[0] ? mapDerivedObjectRow(data[0]) : null;
    },
    async reviewDerivedObjectUpdates(auth, objectId) {
      const object = await getDerivedObjectById(auth, objectId);

      if (!object) {
        return [];
      }

      // Get fragment IDs from junction table
      const { data: fragmentLinks, error: linkError } = await serviceClient
        .from('derived_object_fragments')
        .select('fragment_id')
        .eq('object_id', objectId)
        .eq('user_id', auth.userId);

      throwIfError(linkError);

      const existingFragmentIds = new Set(
        (fragmentLinks ?? []).map((row) => String(row.fragment_id)),
      );

      // Fetch all ready fragments for the user to find unseen ones
      const { data, error } = await serviceClient
        .from('fragments')
        .select('*')
        .eq('user_id', auth.userId)
        .eq('status', 'ready');

      if (error) {
        throw error;
      }

      return buildUpdateSuggestions(
        object,
        (data ?? []).map((row) => mapFragmentRow(row)),
        existingFragmentIds,
      ).map(
        (suggestion): DerivedObjectUpdateSuggestion => ({
          objectId,
          suggestedSummary: suggestion.suggestedSummary,
          suggestedSupportingFragmentIds: suggestion.suggestedSupportingFragmentIds,
        }),
      );
    },
    async mergeDerivedObjects(auth, sourceId, targetId) {
      const [source, target] = await Promise.all([
        getDerivedObjectById(auth, sourceId),
        getDerivedObjectById(auth, targetId),
      ]);

      if (!source || !target) {
        return null;
      }

      const merged: DerivedObject = {
        ...target,
        citations: [...target.citations, ...source.citations],
        relationEdges: [...new Set([...target.relationEdges, ...source.relationEdges])],
        updatedAt: new Date().toISOString(),
      };

      // Merge fragment associations in junction table
      const { data: sourceFragments, error: sourceFragError } = await serviceClient
        .from('derived_object_fragments')
        .select('fragment_id')
        .eq('object_id', sourceId)
        .eq('user_id', auth.userId);

      throwIfError(sourceFragError);

      if (sourceFragments && sourceFragments.length > 0) {
        const rows = sourceFragments.map((row) => ({
          object_id: targetId,
          fragment_id: row.fragment_id,
          user_id: auth.userId,
          added_at: new Date().toISOString(),
        }));
        throwIfError(
          (await serviceClient
            .from('derived_object_fragments')
            .upsert(rows, { onConflict: 'object_id,fragment_id' })).error,
        );
      }

      // Count merged fragments for denormalized count
      const { count: mergedCount, error: countError } = await serviceClient
        .from('derived_object_fragments')
        .select('*', { count: 'exact', head: true })
        .eq('object_id', targetId)
        .eq('user_id', auth.userId);

      throwIfError(countError);

      throwIfError(
        (
          await serviceClient
            .from('derived_objects')
            .update(buildDerivedObjectRow(auth.userId, merged, mergedCount ?? 0))
            .eq('user_id', auth.userId)
            .eq('object_id', targetId)
        ).error,
      );
      throwIfError(
        (
          await serviceClient
            .from('derived_objects')
            .delete()
            .eq('user_id', auth.userId)
            .eq('object_id', sourceId)
        ).error,
      );

      return merged;
    },
    async searchKnowledgeBase(auth, input) {
      const [fragmentResponse, artifactResponse] = await Promise.all([
        serviceClient
          .from('fragments')
          .select('*')
          .eq('user_id', auth.userId)
          .eq('status', 'ready')
          .order('created_at', { ascending: false }),
        serviceClient
          .from('derived_artifacts')
          .select('*')
          .eq('user_id', auth.userId),
      ]);

      if (fragmentResponse.error) {
        throw fragmentResponse.error;
      }

      if (artifactResponse.error) {
        throw artifactResponse.error;
      }

      const fragments = (fragmentResponse.data ?? [])
        .map((row) => mapFragmentRow(row))
        .filter((fragment) => fragment.sourceType !== 'answer');
      const embeddingsByFragmentId = new Map(
        (artifactResponse.data ?? [])
          .filter((row) => row.artifact_type === 'embedding')
          .map((row) => {
            const artifact = mapDerivedArtifactRow(row);
            return [
              artifact.fragmentId,
              Array.isArray(artifact.content.vector)
                ? artifact.content.vector.filter(
                    (value): value is number => typeof value === 'number',
                  )
                : [],
            ] as const;
          }),
      );
      const queryTokens = tokenizeText(input.queryText);
      const queryEmbedding = buildDeterministicQueryEmbedding(queryTokens);
      const ranked = fragments
        .map((fragment) => ({
          fragment,
          score: scoreFragment(
            fragment,
            input.queryText,
            queryTokens,
            queryEmbedding,
            embeddingsByFragmentId.get(fragment.fragmentId) ?? null,
          ),
        }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, 5)
        .map((entry) => entry.fragment);

      const answer = buildAnswerArtifact(input.queryText, input.queryType, ranked);

      throwIfError(
        (await serviceClient.from('answers').insert(buildAnswerRow(auth.userId, answer)))
          .error,
      );

      return answer;
    },
    async saveAnswerAsFragment(auth, answerId) {
      const { data, error } = await serviceClient
        .from('answers')
        .select('*')
        .eq('user_id', auth.userId)
        .eq('answer_id', answerId)
        .limit(1);

      if (error) {
        throw error;
      }

      const answerRow = data?.[0];

      if (!answerRow) {
        return null;
      }

      const answer = mapAnswerRow(answerRow);
      const created = await runtime.ingestFragment(auth, {
        sourceType: 'answer',
        rawText: answer.answerBody,
        titleOptional: answer.queryText,
        originKind: 'answer_promotion',
      });

      throwIfError(
        (
          await serviceClient
            .from('answers')
            .update({ saved_as_fragment: true })
            .eq('answer_id', answerId)
        ).error,
      );

      return {
        fragmentId: created.fragmentId,
        originKind: 'answer_promotion',
        sourceAnswerId: answerId,
      };
    },
  };

  return runtime;
}

export async function runSupabaseProcessingLoop(signal?: AbortSignal) {
  const { serviceClient } = createSupabaseRuntimeClients();

  while (!signal?.aborted) {
    await reclaimExpiredJobs(serviceClient);
    const jobRow = await claimNextQueuedJob(serviceClient);

    if (!jobRow) {
      await delay(1_000, signal);
      continue;
    }

    const heartbeat = startJobHeartbeat(serviceClient, String(jobRow.job_id));

    try {
      const fragmentResponse = await serviceClient
        .from('fragments')
        .select('*')
        .eq('fragment_id', jobRow.fragment_id)
        .limit(1);
      throwIfError(fragmentResponse.error);

      const fragmentRow = fragmentResponse.data?.[0];
      if (!fragmentRow) {
        throw new Error(`Fragment ${String(jobRow.fragment_id)} not found`);
      }

      const fragment = mapFragmentRow(fragmentRow);

      const ctx: PipelineContext = {
        serviceClient,
        fragment,
        userId: fragment.userId,
        jobId: String(jobRow.job_id),
        assets: [],
        artifacts: [],
        existingReady: [],
        relations: [],
        candidateResults: [],
      };
      await runPipeline(ctx, defaultPipeline);

      throwIfError(
        (
          await serviceClient
            .from('processing_jobs')
            .update({
              status: 'completed',
              error_code: null,
              error_message: null,
              claimed_at: null,
              lease_expires_at: null,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('job_id', jobRow.job_id)
        ).error,
      );
      heartbeat.stop();
    } catch (error) {
      heartbeat.stop();
      const message = error instanceof Error ? error.message : String(error);
      await markJobFailure(serviceClient, jobRow, message);
    }
  }
}

async function reclaimExpiredJobs(
  serviceClient: ReturnType<typeof createSupabaseRuntimeClients>['serviceClient'],
) {
  const now = new Date().toISOString();
  const staleResponse = await serviceClient
    .from('processing_jobs')
    .select('*')
    .eq('status', 'running')
    .lt('lease_expires_at', now)
    .order('lease_expires_at', { ascending: true });

  throwIfError(staleResponse.error);

  for (const row of staleResponse.data ?? []) {
    const attemptCount = Number(row.attempt_count ?? 0);
    const shouldRetry = attemptCount < MAX_JOB_ATTEMPTS;
    throwIfError(
      (
        await serviceClient
          .from('processing_jobs')
          .update({
            status: shouldRetry ? 'queued' : 'failed',
            error_code: shouldRetry ? 'lease_expired' : 'max_attempts_exceeded',
            error_message: shouldRetry
              ? 'Job lease expired before completion'
              : 'Job exceeded retry budget after lease expiration',
            claimed_at: null,
            lease_expires_at: null,
            started_at: null,
            updated_at: now,
          })
          .eq('job_id', row.job_id)
          .eq('status', 'running')
      ).error,
    );

    if (!shouldRetry) {
      await markFragmentFailed(
        serviceClient,
        String(row.fragment_id),
        'processing job exceeded retry budget after lease expiration',
      );
    }
  }
}

async function claimNextQueuedJob(
  serviceClient: ReturnType<typeof createSupabaseRuntimeClients>['serviceClient'],
) {
  const queued = await serviceClient
    .from('processing_jobs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(5);

  throwIfError(queued.error);

  for (const candidate of queued.data ?? []) {
    const now = new Date().toISOString();
    const claimedAt = now;
    const leaseExpiresAt = new Date(
      Date.now() + JOB_LEASE_MS,
    ).toISOString();
    const claim = await serviceClient
      .from('processing_jobs')
      .update({
        status: 'running',
        claimed_at: claimedAt,
        lease_expires_at: leaseExpiresAt,
        started_at: claimedAt,
        attempt_count: Number(candidate.attempt_count ?? 0) + 1,
        updated_at: claimedAt,
      })
      .eq('job_id', candidate.job_id)
      .eq('status', 'queued')
      .select('*')
      .limit(1);

    throwIfError(claim.error);

    if (claim.data?.[0]) {
      return claim.data[0];
    }
  }

  return null;
}

async function markJobFailure(
  serviceClient: ReturnType<typeof createSupabaseRuntimeClients>['serviceClient'],
  jobRow: Record<string, unknown>,
  message: string,
) {
  const attemptCount = Number(jobRow.attempt_count ?? 0);
  const shouldRetry = attemptCount < MAX_JOB_ATTEMPTS;
  const updatedAt = new Date().toISOString();

  throwIfError(
    (
      await serviceClient
        .from('processing_jobs')
        .update({
          status: shouldRetry ? 'queued' : 'failed',
          error_code: shouldRetry ? 'retryable_worker_error' : 'worker_error',
          error_message: message,
          claimed_at: null,
          lease_expires_at: null,
          started_at: null,
          updated_at: updatedAt,
        })
        .eq('job_id', jobRow.job_id)
    ).error,
  );

  if (!shouldRetry) {
    await markFragmentFailed(
      serviceClient,
      String(jobRow.fragment_id),
      message,
    );
  }
}

async function markFragmentFailed(
  serviceClient: ReturnType<typeof createSupabaseRuntimeClients>['serviceClient'],
  fragmentId: string,
  _reason: string,
) {
  throwIfError(
    (
      await serviceClient
        .from('fragments')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('fragment_id', fragmentId)
    ).error,
  );
}

function startJobHeartbeat(
  serviceClient: ReturnType<typeof createSupabaseRuntimeClients>['serviceClient'],
  jobId: string,
) {
  const timer = setInterval(() => {
    const now = new Date().toISOString();
    const leaseExpiresAt = new Date(Date.now() + JOB_LEASE_MS).toISOString();

    void serviceClient
      .from('processing_jobs')
      .update({
        lease_expires_at: leaseExpiresAt,
        updated_at: now,
      })
      .eq('job_id', jobId)
      .eq('status', 'running');
  }, JOB_HEARTBEAT_MS);

  return {
    stop() {
      clearInterval(timer);
    },
  };
}

async function ensureUserRecord(
  serviceClient: ReturnType<typeof createSupabaseRuntimeClients>['serviceClient'],
  userId: string,
  createdAt: string,
) {
  throwIfError(
    (
      await serviceClient.from('users').upsert({
        user_id: userId,
        created_at: createdAt,
      })
    ).error,
  );
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

function buildSupabaseRelations(
  existingReady: Fragment[],
  fragment: Fragment,
  artifacts: Awaited<ReturnType<typeof buildDerivedArtifactsForFragmentAsync>>,
): Relation[] {
  const keywords = new Set(
    artifacts
      .flatMap((artifact) =>
        artifact.artifactType === 'tags'
          ? ((artifact.content.tags as string[] | undefined) ?? [])
          : [],
      )
      .map((keyword) => keyword.toLowerCase()),
  );

  const relations: Relation[] = [];

  for (const existing of existingReady) {
    if (existing.fragmentId === fragment.fragmentId) {
      continue;
    }

    const overlap = tokenizeText(
      existing.titleOptional,
      extractFragmentSearchText(existing),
    ).filter((keyword) => keywords.has(keyword));

    if (overlap.length === 0) {
      continue;
    }

    relations.push({
      relationId: randomUUID(),
      sourceObjectType: 'fragment',
      sourceObjectId: fragment.fragmentId,
      targetObjectType: 'fragment',
      targetObjectId: existing.fragmentId,
      relationType: 'related_topic',
      confidence: Math.min(0.99, 0.5 + overlap.length * 0.2),
      explanation: `Shared topic keywords: ${overlap.join(', ').toUpperCase()}`,
      createdAt: new Date().toISOString(),
      algorithmVersion: 'heuristic-v1',
    });
  }

  return relations;
}

function buildAnswerArtifact(
  queryText: string,
  queryType: 'keyword' | 'natural_language',
  fragments: Fragment[],
): AnswerArtifact {
  const citations = fragments.slice(0, 3).map((fragment) => ({
    fragmentId: fragment.fragmentId,
    locator: {
      kind: 'text_span' as const,
      value: '0:42',
    },
    supportPath: 'direct' as const,
  }));

  return {
    answerId: randomUUID(),
    queryText,
    queryType,
    answerBody:
      fragments.length === 0
        ? `No matching fragments were found for "${queryText}".`
        : fragments
            .map(
              (fragment) =>
                extractFragmentSearchText(fragment) ||
                fragment.titleOptional ||
                'Captured fragment',
            )
            .join('\n\n'),
    answerFormat: 'summary',
    retrievalBundle: fragments.map((fragment) => fragment.fragmentId),
    modelMetadata: {
      provider: 'supabase-worker',
      model: 'heuristic',
    },
    citations,
    provenance: {
      sourceQuery: queryText,
      citedFragmentIds: citations.map((citation) => citation.fragmentId),
    },
    savedAsFragment: false,
    createdAt: new Date().toISOString(),
  };
}

function scoreFragment(
  fragment: Fragment,
  queryText: string,
  queryTokens: string[] = tokenizeText(queryText),
  queryEmbedding: number[] | null = null,
  fragmentEmbedding: number[] | null = null,
) {
  const haystackTokens = tokenizeText(
    fragment.titleOptional,
    extractFragmentSearchText(fragment),
  );

  const overlap = haystackTokens.filter((token) => queryTokens.includes(token));
  const embeddingScore =
    queryEmbedding && fragmentEmbedding
      ? cosineSimilarity(queryEmbedding, fragmentEmbedding) * 4
      : 0;
  return overlap.length + embeddingScore + (queryText.length > 0 ? 0.001 : 0);
}

async function delay(ms: number, signal?: AbortSignal) {
  await new Promise<void>((resolve) => {
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, ms);

    const handleAbort = () => {
      clearTimeout(timeoutId);
      resolve();
    };

    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}

function throwIfError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function cosineSimilarity(left: number[], right: number[]) {
  const dimension = Math.max(left.length, right.length);
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < dimension; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}
