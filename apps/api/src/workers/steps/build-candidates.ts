import type { PipelineStep } from '../processing-pipeline.js';
import { buildEntityCandidates } from '../../services/object-candidates/entity-candidate-service.js';
import { buildProjectCandidates } from '../../services/object-candidates/project-candidate-service.js';
import { buildTopicCandidates } from '../../services/object-candidates/topic-candidate-service.js';
import { buildDerivedObjectRow, mapDerivedObjectRow } from '../../runtime/supabase-records.js';

export const buildCandidatesStep: PipelineStep = {
  name: 'build-candidates',
  async execute(ctx) {
    const nextFragments = [...ctx.existingReady, { ...ctx.fragment, status: 'ready' as const }];
    ctx.candidateResults = [
      ...buildTopicCandidates(nextFragments),
      ...buildProjectCandidates(nextFragments),
      ...buildEntityCandidates(nextFragments),
    ];

    if (ctx.candidateResults.length === 0) {
      return;
    }

    const existingResponse = await ctx.serviceClient
      .from('derived_objects')
      .select('*')
      .eq('user_id', ctx.userId);

    if (existingResponse.error) {
      throw new Error(existingResponse.error.message);
    }

    const existingCandidates = new Map(
      (existingResponse.data ?? []).map((row) => {
        const object = mapDerivedObjectRow(row);
        return [`${object.objectType}:${object.title}`, object] as const;
      }),
    );

    const upserts = ctx.candidateResults.map((result) => {
      const existing = existingCandidates.get(
        `${result.object.objectType}:${result.object.title}`,
      );
      const object = existing
        ? {
            ...existing,
            summary: result.object.summary,
            keyEntities: result.object.keyEntities,
            citations: result.object.citations,
            relationEdges: result.object.relationEdges,
            updatedAt: new Date().toISOString(),
          }
        : result.object;

      return {
        row: buildDerivedObjectRow(ctx.userId, object, result.fragmentIds.length),
        fragmentIds: result.fragmentIds,
        objectId: object.objectId,
      };
    });

    const { error: upsertError } = await ctx.serviceClient
      .from('derived_objects')
      .upsert(upserts.map((u) => u.row));

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    const junctionRows = upserts.flatMap((u) =>
      u.fragmentIds.map((fid) => ({
        object_id: u.objectId,
        fragment_id: fid,
        user_id: ctx.userId,
        added_at: new Date().toISOString(),
      })),
    );

    if (junctionRows.length > 0) {
      const { error: junctionError } = await ctx.serviceClient
        .from('derived_object_fragments')
        .upsert(junctionRows, { onConflict: 'object_id,fragment_id' });

      if (junctionError) {
        throw new Error(junctionError.message);
      }
    }
  },
};
