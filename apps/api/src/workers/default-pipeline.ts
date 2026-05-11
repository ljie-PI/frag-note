import { fetchAssetsStep } from './steps/fetch-assets.js';
import { buildArtifactsStep } from './steps/build-artifacts.js';
import { buildRelationsStep } from './steps/build-relations.js';
import { updateFragmentStatusStep } from './steps/update-fragment-status.js';
import { buildCandidatesStep } from './steps/build-candidates.js';
import type { PipelineStep } from './processing-pipeline.js';

export const defaultPipeline: PipelineStep[] = [
  fetchAssetsStep,
  buildArtifactsStep,
  buildRelationsStep,
  updateFragmentStatusStep,
  buildCandidatesStep,
];
