import { Mic, MicOff } from 'lucide-react';
import { useTranslation } from '../../i18n/LocaleContext.tsx';

export function VoiceRecorder({
  recording,
  onToggle,
}: {
  recording: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();

  return (
    <button
      className={`inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors ${recording ? 'text-red-600 bg-red-50 hover:bg-red-100 animate-pulse' : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'}`}
      onClick={onToggle}
      title={recording ? t('capture.recordingStop') : t('capture.recordingStart')}
      type="button"
    >
      {recording ? <MicOff size={18} /> : <Mic size={18} />}
    </button>
  );
}
