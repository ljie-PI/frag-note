import type { DerivedObject } from '@frag-note/domain';
import type { AppState } from './app-state.js';
import { getDerivedObject, listCandidateObjects } from './derived-objects.js';

export function listDerivedObjectCandidates(state: AppState): DerivedObject[] {
  return listCandidateObjects(state);
}

export function getDerivedObjectDetail(
  state: AppState,
  objectId: string,
): DerivedObject | null {
  return getDerivedObject(state, objectId);
}
