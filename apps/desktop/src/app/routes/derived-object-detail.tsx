import type { DerivedObject } from '@frag-note/domain';
import { UpdateSuggestionPanel } from '../../features/organization/update-suggestion-panel.tsx';

export function DerivedObjectDetailPage({
  candidate,
}: {
  candidate: DerivedObject | null;
}) {
  if (!candidate) {
    return (
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">衍生对象详情</h3>
        <p className="text-sm text-slate-500">选择一个整理建议来查看支撑证据。</p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{candidate.title}</h3>
      <p className="text-sm text-slate-500 mb-2">状态：{candidate.status}</p>
      <p className="text-sm text-slate-600 mb-4">{candidate.summary}</p>
      <ul className="list-disc list-inside text-sm text-slate-500 mb-4">
        {candidate.supportingFragmentIds.map((fragmentId) => (
          <li key={fragmentId}>{fragmentId}</li>
        ))}
      </ul>
      <UpdateSuggestionPanel candidate={candidate} />
    </section>
  );
}
