import type { DerivedArtifact, Fragment, Relation } from '@frag-note/domain';
import type { CandidateResult } from '../services/object-candidates/types.js';
import type { createSupabaseRuntimeClients } from '../lib/supabase.js';

export type ServiceClient = ReturnType<typeof createSupabaseRuntimeClients>['serviceClient'];

export type AssetDownload = {
  fileName: string;
  storageKey: string;
  storageBucket: string;
  mimeType: string;
  byteSize: number;
  bytes?: Uint8Array;
};

export type PipelineContext = {
  serviceClient: ServiceClient;
  fragment: Fragment;
  userId: string;
  jobId: string;
  assets: AssetDownload[];
  artifacts: DerivedArtifact[];
  existingReady: Fragment[];
  relations: Relation[];
  candidateResults: CandidateResult[];
};

export type PipelineStep = {
  name: string;
  execute: (ctx: PipelineContext) => Promise<void>;
};

export async function runPipeline(
  ctx: PipelineContext,
  steps: PipelineStep[],
): Promise<void> {
  for (const step of steps) {
    await step.execute(ctx);
  }
}
