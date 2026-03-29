import { randomUUID } from 'node:crypto';
import type { AnswerArtifact, DerivedObject, Fragment, Relation } from '@sui-note/domain';
import type { CreateDeviceSessionResponse } from '@sui-note/contracts/auth';
import { buildDerivedArtifactsForFragment } from '../services/derived-artifacts.js';
import { buildUpdateSuggestions } from '../services/object-candidates/update-suggestions.js';
import { buildEntityCandidates } from '../services/object-candidates/entity-candidate-service.js';
import { buildProjectCandidates } from '../services/object-candidates/project-candidate-service.js';
import { buildTopicCandidates } from '../services/object-candidates/topic-candidate-service.js';
import { tokenizeText } from '../services/text-utils.js';
import { createSupabaseRuntimeClients } from '../lib/supabase.js';
import type { ApiRuntime, DerivedObjectUpdateSuggestion } from './runtime.js';
import {
  buildAnswerRow,
  buildAssetRows,
  buildDerivedArtifactRow,
  buildDerivedObjectRow,
  buildFragmentRecord,
  buildProcessingJobRecord,
  buildRelationRow,
  mapAnswerRow,
  mapAssetRow,
  mapDerivedArtifactRow,
  mapDerivedObjectRow,
  mapFragmentRow,
  mapProcessingJobRow,
  mapRelationRow,
} from './supabase-records.js';

const LEGACY_USER_ID = '99999999-9999-4999-8999-999999999999';

export function createSupabaseRuntime(): ApiRuntime {
  const { serviceClient } = createSupabaseRuntimeClients();
  const getDerivedObjectById = async (objectId: string) => {
    const { data, error } = await serviceClient
      .from('derived_objects')
      .select('*')
      .eq('object_id', objectId)
      .limit(1);

    if (error) {
      throw error;
    }

    return data?.[0] ? mapDerivedObjectRow(data[0]) : null;
  };

  const runtime: ApiRuntime = {
    mode: 'supabase',
    async createDeviceSession() {
      return createLegacyDeviceSession();
    },
    async listFragments() {
      const { data, error } = await serviceClient
        .from('fragments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []).map((row) => mapFragmentRow(row));
    },
    async getFragmentDetail(fragmentId) {
      const { data: fragmentRows, error: fragmentError } = await serviceClient
        .from('fragments')
        .select('*')
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
    async ingestFragment(input) {
      const { fragment, row } = buildFragmentRecord({
        ...input,
        userId: input.userId ?? LEGACY_USER_ID,
      });
      const assets = buildAssetRows(fragment);
      const jobType = inferPrimaryJobType(fragment.sourceType);
      const job = buildProcessingJobRecord(fragment, jobType);

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
    async listDerivedObjectCandidates() {
      const { data, error } = await serviceClient
        .from('derived_objects')
        .select('*')
        .in('status', ['candidate', 'postponed', 'dismissed'])
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []).map((row) => mapDerivedObjectRow(row));
    },
    async getDerivedObjectDetail(objectId) {
      return getDerivedObjectById(objectId);
    },
    async reviewDerivedObject(objectId, action) {
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
        .eq('object_id', objectId)
        .select('*')
        .limit(1);

      if (error) {
        throw error;
      }

      return data?.[0] ? mapDerivedObjectRow(data[0]) : null;
    },
    async reviewDerivedObjectUpdates(objectId) {
      const object = await getDerivedObjectById(objectId);

      if (!object) {
        return [];
      }

      const { data, error } = await serviceClient
        .from('fragments')
        .select('*')
        .in('fragment_id', object.supportingFragmentIds);

      if (error) {
        throw error;
      }

      return buildUpdateSuggestions(
        object,
        (data ?? []).map((row) => mapFragmentRow(row)),
      ).map(
        (suggestion): DerivedObjectUpdateSuggestion => ({
          objectId,
          suggestedSummary: suggestion.suggestedSummary,
          suggestedSupportingFragmentIds: suggestion.suggestedSupportingFragmentIds,
        }),
      );
    },
    async mergeDerivedObjects(sourceId, targetId) {
      const [source, target] = await Promise.all([
        getDerivedObjectById(sourceId),
        getDerivedObjectById(targetId),
      ]);

      if (!source || !target) {
        return null;
      }

      const merged: DerivedObject = {
        ...target,
        supportingFragmentIds: [
          ...new Set([...target.supportingFragmentIds, ...source.supportingFragmentIds]),
        ],
        citations: [...target.citations, ...source.citations],
        relationEdges: [...new Set([...target.relationEdges, ...source.relationEdges])],
        updatedAt: new Date().toISOString(),
      };

      throwIfError(
        (
          await serviceClient
            .from('derived_objects')
            .update(buildDerivedObjectRow(LEGACY_USER_ID, merged))
            .eq('object_id', targetId)
        ).error,
      );
      throwIfError(
        (await serviceClient.from('derived_objects').delete().eq('object_id', sourceId))
          .error,
      );

      return merged;
    },
    async searchKnowledgeBase(input) {
      const { data, error } = await serviceClient
        .from('fragments')
        .select('*')
        .eq('status', 'ready')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const fragments = (data ?? [])
        .map((row) => mapFragmentRow(row))
        .filter((fragment) => fragment.sourceType !== 'answer');
      const ranked = fragments
        .map((fragment) => ({
          fragment,
          score: scoreFragment(fragment, input.queryText),
        }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, 5)
        .map((entry) => entry.fragment);

      const answer = buildAnswerArtifact(input.queryText, input.queryType, ranked);

      throwIfError(
        (await serviceClient.from('answers').insert(buildAnswerRow(LEGACY_USER_ID, answer)))
          .error,
      );

      return answer;
    },
    async saveAnswerAsFragment(answerId) {
      const { data, error } = await serviceClient
        .from('answers')
        .select('*')
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
      const created = await runtime.ingestFragment({
        sourceType: 'answer',
        rawText: answer.answerBody,
        titleOptional: answer.queryText,
        originKind: 'answer_promotion',
        userId: LEGACY_USER_ID,
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
    const queued = await serviceClient
      .from('processing_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(1);

    throwIfError(queued.error);

    const jobRow = queued.data?.[0];

    if (!jobRow) {
      await delay(1_000, signal);
      continue;
    }

    const startedAt = new Date().toISOString();
    throwIfError(
      (
        await serviceClient
          .from('processing_jobs')
          .update({
            status: 'running',
            started_at: startedAt,
            attempt_count: Number(jobRow.attempt_count ?? 0) + 1,
            updated_at: startedAt,
          })
          .eq('job_id', jobRow.job_id)
      ).error,
    );

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
      const artifacts = buildDerivedArtifactsForFragment(fragment);

      if (artifacts.length > 0) {
        throwIfError(
          (
            await serviceClient
              .from('derived_artifacts')
              .insert(
                artifacts.map((artifact) =>
                  buildDerivedArtifactRow(fragment, artifact),
                ),
              )
          ).error,
        );
      }

      const readyFragmentsResponse = await serviceClient
        .from('fragments')
        .select('*')
        .eq('user_id', fragment.userId)
        .eq('status', 'ready');
      throwIfError(readyFragmentsResponse.error);

      const existingReady = (readyFragmentsResponse.data ?? []).map((row) =>
        mapFragmentRow(row),
      );
      const relations = buildSupabaseRelations(existingReady, fragment, artifacts);

      if (relations.length > 0) {
        throwIfError(
          (
            await serviceClient
              .from('relations')
              .insert(relations.map((relation) => buildRelationRow(fragment.userId, relation)))
          ).error,
        );
      }

      throwIfError(
        (
          await serviceClient
            .from('fragments')
            .update({
              status: 'ready',
              updated_at: new Date().toISOString(),
            })
            .eq('fragment_id', fragment.fragmentId)
        ).error,
      );

      const nextFragments = [...existingReady, { ...fragment, status: 'ready' as const }];
      const candidates = [
        ...buildTopicCandidates(nextFragments),
        ...buildProjectCandidates(nextFragments),
        ...buildEntityCandidates(nextFragments),
      ];

      if (candidates.length > 0) {
        const existingCandidatesResponse = await serviceClient
          .from('derived_objects')
          .select('*')
          .eq('user_id', fragment.userId);
        throwIfError(existingCandidatesResponse.error);
        const existingCandidates = new Map(
          (existingCandidatesResponse.data ?? []).map((row) => {
            const object = mapDerivedObjectRow(row);
            return [`${object.objectType}:${object.title}`, object] as const;
          }),
        );

        const upserts = candidates.map((candidate) => {
          const existing = existingCandidates.get(
            `${candidate.objectType}:${candidate.title}`,
          );
          const object = existing
            ? {
                ...existing,
                summary: candidate.summary,
                keyEntities: candidate.keyEntities,
                supportingFragmentIds: candidate.supportingFragmentIds,
                citations: candidate.citations,
                relationEdges: candidate.relationEdges,
                updatedAt: new Date().toISOString(),
              }
            : candidate;

          return buildDerivedObjectRow(fragment.userId, object);
        });

        throwIfError(
          (await serviceClient.from('derived_objects').upsert(upserts)).error,
        );
      }

      throwIfError(
        (
          await serviceClient
            .from('processing_jobs')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('job_id', jobRow.job_id)
        ).error,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throwIfError(
        (
          await serviceClient
            .from('processing_jobs')
            .update({
              status: 'failed',
              error_code: 'worker_error',
              error_message: message,
              updated_at: new Date().toISOString(),
            })
            .eq('job_id', jobRow.job_id)
        ).error,
      );
    }
  }
}

function createLegacyDeviceSession(): CreateDeviceSessionResponse {
  return {
    userId: randomUUID(),
    deviceSessionId: randomUUID(),
    createdAt: new Date().toISOString(),
  };
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
  artifacts: ReturnType<typeof buildDerivedArtifactsForFragment>,
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
      existing.rawTextOptional,
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
            .map((fragment) => fragment.rawTextOptional ?? fragment.titleOptional ?? 'Captured fragment')
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

function scoreFragment(fragment: Fragment, queryText: string) {
  const queryTokens = tokenizeText(queryText);
  const haystackTokens = tokenizeText(
    fragment.titleOptional,
    fragment.rawTextOptional,
  );

  const overlap = haystackTokens.filter((token) => queryTokens.includes(token));
  return overlap.length;
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
