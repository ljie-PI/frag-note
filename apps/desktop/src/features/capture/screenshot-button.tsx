import { invoke } from '@tauri-apps/api/core';
import type { LocalAssetPointer } from '../storage/local-assets.ts';

export function ScreenshotButton({
  onCaptured,
}: {
  onCaptured: (asset: LocalAssetPointer) => void;
}) {
  return (
    <button
      onClick={async () => {
        const localPath =
          typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
            ? await invoke<string>('create_screenshot_placeholder')
            : '/tmp/placeholder-screenshot.png';
        onCaptured({
          fileName: 'placeholder-screenshot.png',
          localPath,
          mimeType: 'image/png',
        });
      }}
      type="button"
    >
      Screenshot
    </button>
  );
}
