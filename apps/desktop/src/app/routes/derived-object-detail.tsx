import type { DerivedObject } from '@frag-note/domain';
import { UpdateSuggestionPanel } from '../../features/organization/update-suggestion-panel.tsx';
import { useTranslation } from '../../i18n/LocaleContext.tsx';

export function DerivedObjectDetailPage({
  candidate,
}: {
  candidate: DerivedObject | null;
}) {
  const { t } = useTranslation();

  if (!candidate) {
    return (
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('organization.derivedDetailTitle')}</h3>
        <p className="text-sm text-slate-500">{t('organization.derivedDetailPlaceholder')}</p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{candidate.title}</h3>
      <p className="text-sm text-slate-500 mb-2">{t('organization.statusLabel')}{candidate.status}</p>
      <p className="text-sm text-slate-600 mb-4">{candidate.summary}</p>
      <ul className="list-disc list-inside text-sm text-slate-500 mb-4">
        {candidate.citations.map((citation) => (
          <li key={citation.fragmentId}>{citation.fragmentId}</li>
        ))}
      </ul>
      <UpdateSuggestionPanel candidate={candidate} />
    </section>
  );
}
