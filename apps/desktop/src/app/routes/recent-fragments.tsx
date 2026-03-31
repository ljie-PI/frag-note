import type { LocalFragmentRecord } from '../../features/capture/capture-store.ts';
import { RetryButton } from '../../components/retry-button.tsx';
import { StatusBadge } from '../../components/status-badge.tsx';
import { FileText } from 'lucide-react';

export function RecentFragmentsPage({
  records,
  onSelect,
  onRetry,
}: {
  records: LocalFragmentRecord[];
  onSelect?: (record: LocalFragmentRecord) => void;
  onRetry?: (record: LocalFragmentRecord) => Promise<void>;
}) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">最近碎片</h2>
      {records.length === 0 ? (
        <div className="text-center py-12">
          <div className="flex justify-center mb-3"><FileText size={48} className="text-slate-300" /></div>
          <p className="text-sm font-medium text-slate-900">暂无碎片</p>
          <p className="text-sm text-slate-500 mt-1">记录你的第一条笔记，它会出现在这里。</p>
        </div>
      ) : (
      <ul className="space-y-3">
        {records.map((record) => (
          <li key={record.fragment.fragmentId} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
            <strong className="text-sm font-medium text-slate-900">{record.fragment.titleOptional ?? '无标题碎片'}</strong>
            <div className="text-sm text-slate-500 mt-1">
              状态：<StatusBadge status={record.fragment.status} />
            </div>
            <div className="text-sm text-slate-500 mt-1 truncate">原文：{record.fragment.rawTextOptional ?? '无原文'}</div>
            {record.derivedArtifacts.length > 0 ? (
              <div className="text-sm text-slate-400 mt-1">
                衍生：{record.derivedArtifacts.map((artifact) => artifact.artifactType).join(', ')}
              </div>
            ) : null}
            {onSelect ? (
              <button onClick={() => onSelect(record)} type="button" className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium">
                查看详情
              </button>
            ) : null}
            {record.fragment.status === 'failed' && onRetry ? (
              <RetryButton onRetry={() => onRetry(record)} />
            ) : null}
          </li>
        ))}
      </ul>
      )}
    </section>
  );
}
