import type { AppState } from './app-state.js';
import { buildUpdateSuggestions } from './object-candidates/update-suggestions.js';

export function reviewDerivedObjectUpdates(state: AppState, objectId: string) {
  const object = state.derivedObjects.get(objectId);

  if (!object) {
    return [];
  }

  const existingFragmentIds = state.derivedObjectFragments.get(objectId) ?? new Set();
  const fragments = [...state.fragments.values()].filter((fragment) =>
    existingFragmentIds.has(fragment.fragmentId),
  );

  return buildUpdateSuggestions(object, fragments, existingFragmentIds);
}
