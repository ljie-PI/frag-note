import { useState } from 'react';
import type { CaptureStore } from './capture-store.ts';
import type { ReturnTypeOfCreateSyncService } from '../sync/types.ts';
import { FileDropzone } from './file-dropzone.tsx';
import { ScreenshotButton } from './screenshot-button.tsx';
import { VoiceRecorder } from './voice-recorder.tsx';
import {
  persistLocalAssetPointer,
  type LocalAssetPointer,
} from '../storage/local-assets.ts';

export function CapturePalette({
  store,
  syncService,
  onSaved,
}: {
  store: CaptureStore;
  syncService: ReturnTypeOfCreateSyncService;
  onSaved: () => Promise<void>;
}) {
  const [titleOptional, setTitleOptional] = useState('');
  const [rawText, setRawText] = useState('');
  const [busy, setBusy] = useState(false);
  const [assets, setAssets] = useState<LocalAssetPointer[]>([]);

  return (
    <section>
      <h2>Capture</h2>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);

          try {
            await store.saveFragment({
              sourceType: assets.some((asset) => asset.mimeType.startsWith('audio/'))
                ? 'voice'
                : assets.some((asset) => asset.mimeType === 'application/pdf')
                  ? 'pdf'
                  : assets.some((asset) => asset.mimeType.startsWith('image/'))
                    ? 'image'
                    : 'text',
              rawText:
                assets.length > 0
                  ? JSON.stringify({
                      rawText,
                      assets,
                    })
                  : rawText,
              titleOptional,
            });
            await syncService.flushQueue();
            setRawText('');
            setTitleOptional('');
            setAssets([]);
            await onSaved();
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Title
          <input
            aria-label="Fragment title"
            value={titleOptional}
            onChange={(event) => setTitleOptional(event.target.value)}
          />
        </label>
        <label>
          Fragment text
          <textarea
            aria-label="Fragment text"
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
          />
        </label>
        <FileDropzone
          assets={assets}
          onAddAsset={(asset) =>
            setAssets((currentAssets) =>
              persistLocalAssetPointer(asset, currentAssets),
            )
          }
        />
        <ScreenshotButton
          onCaptured={(asset) =>
            setAssets((currentAssets) =>
              persistLocalAssetPointer(asset, currentAssets),
            )
          }
        />
        <VoiceRecorder
          onRecorded={(asset) =>
            setAssets((currentAssets) =>
              persistLocalAssetPointer(asset, currentAssets),
            )
          }
        />
        <button disabled={busy} type="submit">
          Save Fragment
        </button>
      </form>
    </section>
  );
}
