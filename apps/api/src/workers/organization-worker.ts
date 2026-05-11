import type { AppState } from '../services/app-state.js';
import type { CandidateResult } from '../services/object-candidates/entity-candidate-service.js';
import { buildEntityCandidates } from '../services/object-candidates/entity-candidate-service.js';
import { buildProjectCandidates } from '../services/object-candidates/project-candidate-service.js';
import { buildTopicCandidates } from '../services/object-candidates/topic-candidate-service.js';

export function runOrganizationWorker(state: AppState): CandidateResult[] {
  const fragments = [...state.fragments.values()].filter(
    (fragment) => fragment.status === 'ready' && fragment.originKind === 'user_capture',
  );

  const results = [
    ...buildTopicCandidates(fragments, state),
    ...buildProjectCandidates(fragments),
    ...buildEntityCandidates(fragments),
  ];

  for (const result of results) {
    const existing = state.derivedObjects.get(result.object.objectId);
    state.derivedObjects.set(result.object.objectId, existing ?? result.object);
    if (!existing) {
      state.derivedObjectFragments.set(
        result.object.objectId,
        new Set(result.fragmentIds),
      );
    }
  }

  return results;
}
