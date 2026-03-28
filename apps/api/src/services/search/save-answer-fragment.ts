import type { AppState } from '../app-state.js';
import { promoteAnswerToFragment } from '../fragment-ingestion.js';

export function saveAnswerAsFragment(
  state: AppState,
  answerId: string,
): {
  fragmentId: string;
  originKind: 'answer_promotion';
  sourceAnswerId: string;
} | null {
  const answer = state.answers.get(answerId);

  if (!answer) {
    return null;
  }

  const fragment = promoteAnswerToFragment(state, answer);

  return {
    fragmentId: fragment.fragmentId,
    originKind: 'answer_promotion',
    sourceAnswerId: answerId,
  };
}
