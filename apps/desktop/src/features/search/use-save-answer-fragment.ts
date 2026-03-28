import type { AnswerArtifact } from '@sui-note/domain';

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
