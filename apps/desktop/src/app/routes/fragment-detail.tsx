import type { LocalFragmentRecord } from '../../features/capture/capture-store.ts';
import { useTranslation } from '../../i18n/LocaleContext.tsx';

export function FragmentDetailPage({
  record,
}: {
  record: LocalFragmentRecord | null;
}) {
  const { t } = useTranslation();

  if (!record) {
    return (
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('fragment.detailTitle')}</h3>
        <p className="text-sm text-slate-500">{t('fragment.detailPlaceholder')}</p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('fragment.detailTitle')}</h3>
      <div className="text-sm font-medium text-slate-700 mb-1">{t('fragment.rawContent')}</div>
      <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 mb-4">{record.fragment.rawTextOptional ?? t('fragment.noRawText')}</p>
      <div className="text-sm font-medium text-slate-700 mb-1">{t('fragment.derivedArtifacts')}</div>
      <ul className="list-disc list-inside text-sm text-slate-600 mb-4">
        {record.derivedArtifacts.map((artifact) => (
          <li key={artifact.artifactId}>{artifact.artifactType}</li>
        ))}
      </ul>
      <div className="text-sm font-medium text-slate-700 mb-1">{t('fragment.relatedFragments')}</div>
      <ul className="list-disc list-inside text-sm text-slate-600 mb-4">
        {record.relatedFragments.map((relation) => (
          <li key={relation.relationId}>{relation.explanation}</li>
        ))}
      </ul>
    </section>
  );
}
