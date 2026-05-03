import type { DerivedObject } from '@frag-note/domain';

export function UpdateSuggestionPanel({
  candidate,
}: {
  candidate: DerivedObject | null;
}) {
  if (!candidate) {
    return null;
  }

  return (
    <section className="mt-4 border-t border-slate-200 pt-4">
      <h4 className="text-sm font-medium text-slate-700 mb-1">更新建议</h4>
      <p className="text-sm text-slate-600">{candidate.summary}</p>
      <p className="text-xs text-slate-400 mt-1">规则版本：{candidate.ruleVersion}</p>
    </section>
  );
}
