import type { AppState } from './app-state.js';
import { buildUpdateSuggestions } from './object-candidates/update-suggestions.js';

export function reviewDerivedObjectUpdates(state: AppState, objectId: string) {
  const object = state.derivedObjects.get(objectId);

  if (!object) {
    return [];
  }

  const fragments = [...state.fragments.values()].filter((fragment) =>
    object.supportingFragmentIds.includes(fragment.fragmentId),
  );

  return buildUpdateSuggestions(object, fragments);
}
