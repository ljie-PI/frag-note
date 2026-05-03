import { randomUUID } from 'node:crypto';
import type { AnswerArtifact } from '@frag-note/domain';
import type { AppState } from '../app-state.js';

export function generateAnswer(
  state: AppState,
  input: {
    queryText: string;
    queryType: 'keyword' | 'natural_language';
    fragments: Array<{
      fragmentId: string;
      rawTextOptional?: string | null;
      titleOptional?: string | null;
    }>;
    citations: AnswerArtifact['citations'];
    derivedObjectTitles?: string[];
  },
): AnswerArtifact {
  const fragments = input.fragments;
  const answerBody =
    fragments.length === 0
      ? `No matching fragments were found for "${input.queryText}".`
      : `${fragments
          .slice(0, 2)
          .map(
            (fragment) =>
              fragment.rawTextOptional ??
              fragment.titleOptional ??
              'Captured fragment',
          )
          .join(' ')}${
          input.derivedObjectTitles?.length
            ? ` Confirmed objects: ${input.derivedObjectTitles.join(', ')}.`
            : ''
        }`;

  const answer: AnswerArtifact = {
    answerId: randomUUID(),
    queryText: input.queryText,
    queryType: input.queryType,
    answerBody,
    answerFormat: 'summary',
    retrievalBundle: fragments.map((fragment) => fragment.fragmentId),
    modelMetadata: {
      provider: 'in-memory',
      model: 'heuristic',
    },
    citations: input.citations,
    provenance: {
      sourceQuery: input.queryText,
      citedFragmentIds: input.citations.map((citation) => citation.fragmentId),
    },
    savedAsFragment: false,
    createdAt: new Date().toISOString(),
  };

  state.answers.set(answer.answerId, answer);
  return answer;
}
