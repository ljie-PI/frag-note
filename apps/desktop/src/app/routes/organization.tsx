import type { DerivedObject } from '@frag-note/domain';
import { CandidateCard } from '../../features/organization/candidate-card.tsx';
import { FolderKanban } from 'lucide-react';
import { useTranslation } from '../../i18n/LocaleContext.tsx';

export function OrganizationPage({
  candidates,
  onSelect,
  onConfirm,
  onDismiss,
  onPostpone,
}: {
  candidates: DerivedObject[];
  onSelect?: (candidate: DerivedObject) => void;
  onConfirm?: (candidate: DerivedObject) => Promise<void>;
  onDismiss?: (candidate: DerivedObject) => Promise<void>;
  onPostpone?: (candidate: DerivedObject) => Promise<void>;
}) {
  const { t } = useTranslation();

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('organization.title')}</h2>
      {candidates.length === 0 ? (
        <div className="text-center py-12">
          <div className="flex justify-center mb-3"><FolderKanban size={48} className="text-slate-300" /></div>
          <p className="text-sm font-medium text-slate-900">{t('organization.emptyTitle')}</p>
          <p className="text-sm text-slate-500 mt-1">{t('organization.emptyDescription')}</p>
        </div>
      ) : (
      <div className="space-y-4">
        {candidates.map((candidate) => (
          <div key={candidate.objectId} className="border border-slate-200 rounded-lg p-4">
            <CandidateCard
              candidate={candidate}
              onConfirm={() => onConfirm?.(candidate)}
              onDismiss={() => onDismiss?.(candidate)}
              onPostpone={() => onPostpone?.(candidate)}
            />
            {onSelect ? (
              <button onClick={() => onSelect(candidate)} type="button" className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium">
                {t('organization.viewDetail')}
              </button>
            ) : null}
          </div>
        ))}
      </div>
      )}
    </section>
  );
}
