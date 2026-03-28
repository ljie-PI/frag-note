import type { AnswerArtifact } from '@sui-note/domain';

export function AnswerPanel({
  answer,
  onSave,
}: {
  answer: AnswerArtifact | null;
  onSave: (answer: AnswerArtifact) => Promise<void>;
}) {
  if (!answer) {
    return (
      <section>
        <h3>Answer</h3>
        <p>No answer yet.</p>
      </section>
    );
  }

  return (
    <section>
      <h3>Answer</h3>
      <p>{answer.answerBody}</p>
      <h4>Citations</h4>
      <ul>
        {answer.citations.map((citation, index) => (
          <li key={`${citation.fragmentId}-${index}`}>
            {citation.fragmentId} ({citation.supportPath})
          </li>
        ))}
      </ul>
      <button
        onClick={async () => {
          await onSave(answer);
        }}
        type="button"
      >
        Save as Fragment
      </button>
    </section>
  );
}
