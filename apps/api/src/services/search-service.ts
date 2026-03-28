import type { AnswerArtifact } from '@sui-note/domain';
import type { AppState } from './app-state.js';
import { buildCitationBundle } from './search/build-citation-bundle.js';
import { generateAnswer } from './search/generate-answer.js';
import { retrieveFragments } from './search/retrieve-fragments.js';
import { saveAnswerAsFragment as promoteAnswer } from './search/save-answer-fragment.js';

export type SearchInput = {
  queryText: string;
  queryType: 'keyword' | 'natural_language';
};

export function searchKnowledgeBase(
  state: AppState,
  input: SearchInput,
): AnswerArtifact {
  const retrieval = retrieveFragments(state, { query: input.queryText });
  const citations = buildCitationBundle({
    fragments: retrieval.fragments,
    derivedObjectExpansion: retrieval.derivedObjectExpansion,
  });

  return generateAnswer(state, {
    queryText: input.queryText,
    queryType: input.queryType,
    fragments: retrieval.fragments,
    citations,
    derivedObjectTitles: retrieval.derivedObjectExpansion.map(
      (candidate) => candidate.title,
    ),
  });
}

export function saveAnswerAsFragment(state: AppState, answerId: string): {
  fragmentId: string;
  originKind: 'answer_promotion';
  sourceAnswerId: string;
} | null {
  return promoteAnswer(state, answerId);
}
