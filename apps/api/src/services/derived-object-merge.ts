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
    citations: [...target.citations, ...source.citations],
    relationEdges: [...new Set([...target.relationEdges, ...source.relationEdges])],
    updatedAt: new Date().toISOString(),
  };

  // Merge fragment associations
  const targetFragments = state.derivedObjectFragments.get(targetId) ?? new Set();
  const sourceFragments = state.derivedObjectFragments.get(sourceId) ?? new Set();
  state.derivedObjectFragments.set(
    targetId,
    new Set([...targetFragments, ...sourceFragments]),
  );

  state.derivedObjects.set(targetId, merged);
  state.derivedObjects.delete(sourceId);
  state.derivedObjectFragments.delete(sourceId);
  return merged;
}
