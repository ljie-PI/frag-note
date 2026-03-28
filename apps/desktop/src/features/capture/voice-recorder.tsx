import { invoke } from '@tauri-apps/api/core';
import type { LocalAssetPointer } from '../storage/local-assets.ts';

export function VoiceRecorder({
  onRecorded,
}: {
  onRecorded: (asset: LocalAssetPointer) => void;
}) {
  return (
    <button
      onClick={async () => {
        const localPath =
          typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
            ? await invoke<string>('create_voice_placeholder')
            : '/tmp/placeholder-voice.webm';
        onRecorded({
          fileName: 'placeholder-voice.webm',
          localPath,
          mimeType: 'audio/webm',
        });
      }}
      type="button"
    >
      Record Voice
    </button>
  );
}
