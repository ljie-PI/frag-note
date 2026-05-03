import type { AnswerArtifact } from '@frag-note/domain';

export function useSaveAnswerFragment({
  saveAnswerAsFragment,
}: {
  saveAnswerAsFragment: (answer: AnswerArtifact) => Promise<void>;
}) {
  return {
    async save(answer: AnswerArtifact) {
      await saveAnswerAsFragment(answer);
    },
  };
}
