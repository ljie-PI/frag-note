import type { DerivedObject } from '@sui-note/domain';
import type { AppState } from '../services/app-state.js';
import { buildEntityCandidates } from '../services/object-candidates/entity-candidate-service.js';
import { buildProjectCandidates } from '../services/object-candidates/project-candidate-service.js';
import { buildTopicCandidates } from '../services/object-candidates/topic-candidate-service.js';

export function runOrganizationWorker(state: AppState): DerivedObject[] {
  const fragments = [...state.fragments.values()].filter(
    (fragment) => fragment.status === 'ready' && fragment.originKind === 'user_capture',
  );

  const candidates = [
    ...buildTopicCandidates(fragments, state),
    ...buildProjectCandidates(fragments),
    ...buildEntityCandidates(fragments),
  ];

  for (const candidate of candidates) {
    const existing = state.derivedObjects.get(candidate.objectId);
    state.derivedObjects.set(candidate.objectId, existing ?? candidate);
  }

  return candidates;
}
