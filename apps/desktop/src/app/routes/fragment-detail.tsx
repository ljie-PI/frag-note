import type { LocalFragmentRecord } from '../../features/capture/capture-store.ts';

export function FragmentDetailPage({
  record,
}: {
  record: LocalFragmentRecord | null;
}) {
  if (!record) {
    return (
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">碎片详情</h3>
        <p className="text-sm text-slate-500">选择一个碎片来查看原始内容和衍生数据。</p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">碎片详情</h3>
      <div className="text-sm font-medium text-slate-700 mb-1">原始内容</div>
      <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 mb-4">{record.fragment.rawTextOptional ?? '无原文'}</p>
      <div className="text-sm font-medium text-slate-700 mb-1">衍生产物</div>
      <ul className="list-disc list-inside text-sm text-slate-600 mb-4">
        {record.derivedArtifacts.map((artifact) => (
          <li key={artifact.artifactId}>{artifact.artifactType}</li>
        ))}
      </ul>
      <div className="text-sm font-medium text-slate-700 mb-1">关联碎片</div>
      <ul className="list-disc list-inside text-sm text-slate-600 mb-4">
        {record.relatedFragments.map((relation) => (
          <li key={relation.relationId}>{relation.explanation}</li>
        ))}
      </ul>
    </section>
  );
}
