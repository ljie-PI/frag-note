import { describe, expect, it } from 'bun:test';
import { runPipeline } from '../../../apps/api/src/workers/processing-pipeline.ts';
import type { PipelineContext, PipelineStep } from '../../../apps/api/src/workers/processing-pipeline.ts';

function makeContext(overrides: Partial<PipelineContext> = {}): PipelineContext {
  return {
    serviceClient: {} as any,
    fragment: { fragmentId: 'frag-1' } as any,
    userId: 'u1',
    jobId: 'job-1',
    assets: [],
    artifacts: [],
    existingReady: [],
    relations: [],
    candidateResults: [],
    ...overrides,
  };
}

describe('runPipeline', () => {
  it('executes steps in order', async () => {
    const order: number[] = [];
    const steps: PipelineStep[] = [
      { name: 'step1', execute: async () => { order.push(1); } },
      { name: 'step2', execute: async () => { order.push(2); } },
      { name: 'step3', execute: async () => { order.push(3); } },
    ];
    await runPipeline(makeContext(), steps);
    expect(order).toEqual([1, 2, 3]);
  });

  it('passes context through steps (mutations visible)', async () => {
    const ctx = makeContext();
    const steps: PipelineStep[] = [
      { name: 'add-asset', execute: async (c) => { c.assets.push({ fileName: 'test' } as any); } },
      { name: 'check-asset', execute: async (c) => { expect(c.assets).toHaveLength(1); } },
    ];
    await runPipeline(ctx, steps);
  });

  it('wraps error with step name, jobId, fragmentId', async () => {
    const steps: PipelineStep[] = [
      { name: 'failing-step', execute: async () => { throw new Error('boom'); } },
    ];
    await expect(runPipeline(makeContext(), steps)).rejects.toThrow(
      'Pipeline step "failing-step" failed (job=job-1, fragment=frag-1): boom',
    );
  });

  it('completes successfully with empty steps', async () => {
    await expect(runPipeline(makeContext(), [])).resolves.toBeUndefined();
  });
});
