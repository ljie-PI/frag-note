import { useTranslation } from '../i18n/LocaleContext.tsx';

export function RetryButton({
  onRetry,
}: {
  onRetry: () => Promise<void> | void;
}) {
  const { t } = useTranslation();

  return (
    <button
      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
      onClick={() => {
        void onRetry();
      }}
      type="button"
    >
      {t('common.retry')}
    </button>
  );
}
