import type { Fragment, ProcessingJob } from '@sui-note/domain';
import type { AppState } from '../services/app-state.js';
import { buildDerivedArtifactsForFragment } from '../services/derived-artifacts.js';
import { buildRelatedFragmentLinks } from '../services/relation-linking.js';
import { runOrganizationWorker } from './organization-worker.js';

export function runFragmentProcessing(
  state: AppState,
  fragment: Fragment,
  job: ProcessingJob,
) {
  const artifacts = buildDerivedArtifactsForFragment(fragment);
  state.artifactsByFragmentId.set(fragment.fragmentId, artifacts);

  const relations = buildRelatedFragmentLinks(state, fragment, artifacts);
  for (const relation of relations) {
    const existingSource = state.relationsBySourceId.get(relation.sourceObjectId) ?? [];
    state.relationsBySourceId.set(relation.sourceObjectId, [...existingSource, relation]);
    const existingTarget = state.relationsByTargetId.get(relation.targetObjectId) ?? [];
    state.relationsByTargetId.set(relation.targetObjectId, [...existingTarget, relation]);
  }

  state.processingJobsByFragmentId.set(fragment.fragmentId, [
    {
      ...job,
      status: 'completed',
      completedAt: new Date().toISOString(),
    },
  ]);

  state.fragments.set(fragment.fragmentId, {
    ...fragment,
    status: 'ready',
  });

  runOrganizationWorker(state);

  return {
    artifacts,
    relations,
  };
}
