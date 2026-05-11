import type { PipelineStep } from '../processing-pipeline.js';

export const updateFragmentStatusStep: PipelineStep = {
  name: 'update-fragment-status',
  async execute(ctx) {
    const now = new Date().toISOString();
    const { error } = await ctx.serviceClient
      .from('fragments')
      .update({
        status: 'ready',
        updated_at: now,
      })
      .eq('fragment_id', ctx.fragment.fragmentId);

    if (error) {
      throw new Error(error.message);
    }

    ctx.fragment = { ...ctx.fragment, status: 'ready' as const };
  },
};
