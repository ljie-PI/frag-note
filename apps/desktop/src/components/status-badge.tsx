import { useTranslation } from '../i18n/LocaleContext.tsx';

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();

  const colorMap: Record<string, string> = {
    queued_upload: 'bg-yellow-100 text-yellow-800',
    uploading: 'bg-blue-100 text-blue-800',
    processing: 'bg-blue-100 text-blue-800',
    complete: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };
  const colors = colorMap[status] ?? 'bg-slate-100 text-slate-800';
  const label = t(`status.${status}`);
  // If translation returns the key itself, fall back to raw status
  const displayLabel = label === `status.${status}` ? status : label;
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors}`}>{displayLabel}</span>;
}
