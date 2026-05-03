import type { DerivedArtifact, Fragment } from '@frag-note/domain';
import type { AppState } from '../app-state.js';
import { expandDerivedObjects } from './expand-derived-objects.js';
import { expandRelations } from './expand-relations.js';
import { retrieveArtifacts } from './retrieve-artifacts.js';

export function retrieveFragments(
  state: AppState,
  input: { query: string },
) {
  const keywords = tokenize(input.query);
  const fragments = [...state.fragments.values()]
    .filter((fragment) => fragment.status === 'ready')
    .map((fragment) => ({
      fragment,
      score: scoreFragment(
        fragment,
        state.artifactsByFragmentId.get(fragment.fragmentId) ?? [],
        keywords,
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.fragment);

  const artifactMatches = retrieveArtifacts(state, input.query, fragments);
  const relationExpansion = expandRelations(state, fragments);
  const derivedObjectExpansion = expandDerivedObjects(
    state,
    fragments,
    relationExpansion,
  );

  return {
    fragments,
    artifactMatches,
    relationExpansion,
    derivedObjectExpansion,
  };
}

function scoreFragment(
  fragment: Fragment,
  artifacts: DerivedArtifact[],
  keywords: string[],
): number {
  const haystack = [
    fragment.titleOptional,
    fragment.rawTextOptional,
    ...artifacts.map((artifact) => JSON.stringify(artifact.content)),
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase();

  return keywords.reduce(
    (score, keyword) => score + (haystack.includes(keyword) ? 1 : 0),
    0,
  );
}

function tokenize(text: string): string[] {
  return [
    ...new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 3),
    ),
  ];
}
