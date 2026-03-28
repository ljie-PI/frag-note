import type { AppState } from './app-state.js';

export function mergeDerivedObjects(
  state: AppState,
  sourceId: string,
  targetId: string,
) {
  const source = state.derivedObjects.get(sourceId);
  const target = state.derivedObjects.get(targetId);

  if (!source || !target) {
    return null;
  }

  const merged = {
    ...target,
    supportingFragmentIds: [
      ...new Set([
        ...target.supportingFragmentIds,
        ...source.supportingFragmentIds,
      ]),
    ],
    citations: [...target.citations, ...source.citations],
    relationEdges: [...new Set([...target.relationEdges, ...source.relationEdges])],
    updatedAt: new Date().toISOString(),
  };

  state.derivedObjects.set(targetId, merged);
  state.derivedObjects.delete(sourceId);
  return merged;
}
