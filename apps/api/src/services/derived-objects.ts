import type { DerivedObject } from '@frag-note/domain';
import type { AppState } from './app-state.js';

export function listCandidateObjects(state: AppState): DerivedObject[] {
  return [...state.derivedObjects.values()].filter(
    (candidate) =>
      candidate.status === 'candidate' ||
      candidate.status === 'postponed' ||
      candidate.status === 'dismissed',
  );
}

export function getDerivedObject(
  state: AppState,
  objectId: string,
): DerivedObject | null {
  return state.derivedObjects.get(objectId) ?? null;
}

export function updateDerivedObjectStatus(
  state: AppState,
  objectId: string,
  status: DerivedObject['status'],
): DerivedObject | null {
  const candidate = state.derivedObjects.get(objectId);

  if (!candidate) {
    return null;
  }

  const updatedCandidate: DerivedObject = {
    ...candidate,
    status,
    updatedAt: new Date().toISOString(),
  };

  state.derivedObjects.set(objectId, updatedCandidate);

  if (status === 'dismissed') {
    state.dismissedCandidateKeys.add(
      `${updatedCandidate.objectType}:${updatedCandidate.title.toLowerCase().replace(/\s+research$/, '')}`,
    );
  }

  return updatedCandidate;
}
