import type { DerivedArtifact, Fragment } from '@frag-note/domain';
import type { AppState } from '../app-state.js';

export function retrieveArtifacts(
  state: AppState,
  query: string,
  fragments: Fragment[],
): DerivedArtifact[] {
  const loweredQuery = query.toLowerCase();

  return fragments.flatMap((fragment) =>
    (state.artifactsByFragmentId.get(fragment.fragmentId) ?? []).filter((artifact) =>
      JSON.stringify(artifact.content).toLowerCase().includes(loweredQuery),
    ),
  );
}
