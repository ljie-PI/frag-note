import type { LocalFragmentRecord } from '../../features/capture/capture-store.ts';
import { RetryButton } from '../../components/retry-button.tsx';
import { StatusBadge } from '../../components/status-badge.tsx';
import { FileText } from 'lucide-react';
import { useTranslation } from '../../i18n/LocaleContext.tsx';

export function RecentFragmentsPage({
  records,
  onSelect,
  onRetry,
}: {
  records: LocalFragmentRecord[];
  onSelect?: (record: LocalFragmentRecord) => void;
  onRetry?: (record: LocalFragmentRecord) => Promise<void>;
}) {
  const { t } = useTranslation();

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('fragment.recentTitle')}</h2>
      {records.length === 0 ? (
        <div className="text-center py-12">
          <div className="flex justify-center mb-3"><FileText size={48} className="text-slate-300" /></div>
          <p className="text-sm font-medium text-slate-900">{t('fragment.emptyTitle')}</p>
          <p className="text-sm text-slate-500 mt-1">{t('fragment.emptyDescription')}</p>
        </div>
      ) : (
      <ul className="space-y-3">
        {records.map((record) => (
          <li key={record.fragment.fragmentId} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
            <strong className="text-sm font-medium text-slate-900">{record.fragment.titleOptional ?? t('fragment.untitled')}</strong>
            <div className="text-sm text-slate-500 mt-1">
              {t('fragment.statusLabel')}<StatusBadge status={record.fragment.status} />
            </div>
            <div className="text-sm text-slate-500 mt-1 truncate">{t('fragment.rawTextLabel')}{record.fragment.rawTextOptional ?? t('fragment.noRawText')}</div>
            {record.derivedArtifacts.length > 0 ? (
              <div className="text-sm text-slate-400 mt-1">
                {t('fragment.derivedLabel')}{record.derivedArtifacts.map((artifact) => artifact.artifactType).join(', ')}
              </div>
            ) : null}
            {onSelect ? (
              <button onClick={() => onSelect(record)} type="button" className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium">
                {t('fragment.viewDetail')}
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
