import { randomUUID } from 'node:crypto';
import type { Fragment, Relation } from '@frag-note/domain';
import type { PipelineStep } from '../processing-pipeline.js';
import { buildDerivedArtifactsForFragmentAsync } from '../../services/derived-artifacts.js';
import { buildRelationRow, mapFragmentRow } from '../../runtime/supabase-records.js';
import { extractFragmentSearchText } from '../../services/fragment-content.js';
import { tokenizeText } from '../../services/text-utils.js';

export const buildRelationsStep: PipelineStep = {
  name: 'build-relations',
  async execute(ctx) {
    const readyResponse = await ctx.serviceClient
      .from('fragments')
      .select('*')
      .eq('user_id', ctx.userId)
      .eq('status', 'ready');

    if (readyResponse.error) {
      throw new Error(readyResponse.error.message);
    }

    ctx.existingReady = (readyResponse.data ?? []).map((row) => mapFragmentRow(row));

    const keywords = new Set(
      ctx.artifacts
        .flatMap((artifact) =>
          artifact.artifactType === 'tags'
            ? ((artifact.content.tags as string[] | undefined) ?? [])
            : [],
        )
        .map((keyword) => keyword.toLowerCase()),
    );

    ctx.relations = [];
    for (const existing of ctx.existingReady) {
      if (existing.fragmentId === ctx.fragment.fragmentId) {
        continue;
      }

      const overlap = tokenizeText(
        existing.titleOptional,
        extractFragmentSearchText(existing),
      ).filter((keyword) => keywords.has(keyword));

      if (overlap.length === 0) {
        continue;
      }

      ctx.relations.push({
        relationId: randomUUID(),
        sourceObjectType: 'fragment',
        sourceObjectId: ctx.fragment.fragmentId,
        targetObjectType: 'fragment',
        targetObjectId: existing.fragmentId,
        relationType: 'related_topic',
        confidence: Math.min(0.99, 0.5 + overlap.length * 0.2),
        explanation: `Shared topic keywords: ${overlap.join(', ').toUpperCase()}`,
        createdAt: new Date().toISOString(),
        algorithmVersion: 'heuristic-v1',
      });
    }

    if (ctx.relations.length > 0) {
      const { error } = await ctx.serviceClient
        .from('relations')
        .insert(ctx.relations.map((relation) => buildRelationRow(ctx.userId, relation)));
      if (error) {
        throw new Error(error.message);
      }
    }
  },
};
