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
      <section className="mt-4">
        <h3 className="text-sm font-medium text-slate-700 mb-2">回答</h3>
        <p className="text-sm text-slate-500">暂无回答</p>
      </section>
    );
  }

  return (
    <section className="mt-4">
      <h3 className="text-sm font-medium text-slate-700 mb-2">回答</h3>
      <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 mb-3">{answer.answerBody}</p>
      <h4 className="text-sm font-medium text-slate-700 mb-1">引用来源</h4>
      <ul className="list-disc list-inside text-sm text-slate-500 mb-3">
        {answer.citations.map((citation, index) => (
          <li key={`${citation.fragmentId}-${index}`}>
            {citation.fragmentId} ({citation.supportPath})
          </li>
        ))}
      </ul>
      <button
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        onClick={async () => {
          await onSave(answer);
        }}
        type="button"
      >
        保存为碎片
      </button>
    </section>
  );
}
