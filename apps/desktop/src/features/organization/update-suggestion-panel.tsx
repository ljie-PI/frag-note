import type { DerivedObject } from '@frag-note/domain';
import { useTranslation } from '../../i18n/LocaleContext.tsx';

export function UpdateSuggestionPanel({
  candidate,
}: {
  candidate: DerivedObject | null;
}) {
  const { t } = useTranslation();

  if (!candidate) {
    return null;
  }

  return (
    <section className="mt-4 border-t border-slate-200 pt-4">
      <h4 className="text-sm font-medium text-slate-700 mb-1">{t('organization.updateSuggestion')}</h4>
      <p className="text-sm text-slate-600">{candidate.summary}</p>
      <p className="text-xs text-slate-400 mt-1">{t('organization.ruleVersion')}{candidate.ruleVersion}</p>
    </section>
  );
}
