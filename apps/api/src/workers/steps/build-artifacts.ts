import type { PipelineStep } from '../processing-pipeline.js';
import { buildDerivedArtifactsForFragmentAsync } from '../../services/derived-artifacts.js';
import { buildDerivedArtifactRow } from '../../runtime/supabase-records.js';

export const buildArtifactsStep: PipelineStep = {
  name: 'build-artifacts',
  async execute(ctx) {
    ctx.artifacts = await buildDerivedArtifactsForFragmentAsync(
      ctx.fragment,
      ctx.assets,
    );

    if (ctx.artifacts.length > 0) {
      const { error } = await ctx.serviceClient
        .from('derived_artifacts')
        .insert(
          ctx.artifacts.map((artifact) =>
            buildDerivedArtifactRow(ctx.fragment, artifact),
          ),
        );
      if (error) {
        throw new Error(error.message);
      }
    }
  },
};
