import { useTranslation } from '../../i18n/LocaleContext.tsx';

export function ReviewActions({
  onConfirm,
  onDismiss,
  onPostpone,
}: {
  onConfirm: () => Promise<void> | void;
  onDismiss: () => Promise<void> | void;
  onPostpone: () => Promise<void> | void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2 mt-3">
      <button className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 transition-colors" onClick={() => void onConfirm()} type="button">
        {t('organization.confirm')}
      </button>
      <button className="rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 transition-colors" onClick={() => void onDismiss()} type="button">
        {t('organization.dismiss')}
      </button>
      <button className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors" onClick={() => void onPostpone()} type="button">
        {t('organization.postpone')}
      </button>
    </div>
  );
}
