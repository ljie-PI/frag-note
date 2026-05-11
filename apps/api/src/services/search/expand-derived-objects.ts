import type { DerivedObject, Fragment, Relation } from '@frag-note/domain';
import type { AppState } from '../app-state.js';

export function expandDerivedObjects(
  state: AppState,
  fragments: Fragment[],
  relations: Relation[],
): DerivedObject[] {
  const fragmentIds = new Set([
    ...fragments.map((fragment) => fragment.fragmentId),
    ...relations.map((relation) => relation.targetObjectId),
  ]);

  return [...state.derivedObjects.values()].filter((candidate) => {
    if (candidate.status !== 'confirmed') {
      return false;
    }
    const objectFragments = state.derivedObjectFragments.get(candidate.objectId);
    if (!objectFragments) {
      return false;
    }
    for (const fragmentId of objectFragments) {
      if (fragmentIds.has(fragmentId)) return true;
    }
    return false;
  });
}
