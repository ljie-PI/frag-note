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

  return [...state.derivedObjects.values()].filter(
    (candidate) =>
      candidate.status === 'confirmed' &&
      candidate.supportingFragmentIds.some((fragmentId) => fragmentIds.has(fragmentId)),
  );
}
