import { Mic, MicOff } from 'lucide-react';
import type { LocalAssetPointer } from '../storage/local-assets.ts';
import { useVoiceRecorder } from './use-voice-recorder.ts';

export function VoiceRecorder({
  onRecorded,
}: {
  onRecorded: (asset: LocalAssetPointer) => void;
}) {
  const { recording, toggleRecording } = useVoiceRecorder(onRecorded);

  return (
    <button
      className={`inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors ${recording ? 'text-red-600 bg-red-50 hover:bg-red-100 animate-pulse' : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'}`}
      onClick={() => void toggleRecording()}
      title={recording ? '停止录音' : '录音'}
      type="button"
    >
      {recording ? <MicOff size={18} /> : <Mic size={18} />}
    </button>
  );
}
