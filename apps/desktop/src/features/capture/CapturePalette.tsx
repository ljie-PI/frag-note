import { useState } from 'react';
import { Camera, Mic, MicOff, Paperclip, PenLine, Send } from 'lucide-react';
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
  const [rawText, setRawText] = useState('');
  const [busy, setBusy] = useState(false);
  const [assets, setAssets] = useState<LocalAssetPointer[]>([]);

  const addAsset = (asset: LocalAssetPointer) =>
    setAssets((current) => persistLocalAssetPointer(asset, current));

  const hasContent = rawText.trim().length > 0 || assets.length > 0;

  return (
    <div className="flex flex-col items-center justify-center h-full">
      {/* Greeting */}
      <h2 className="text-2xl font-semibold text-slate-700 mb-6">有什么想记下的？</h2>

      <form
        className="w-full max-w-2xl"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!hasContent) return;
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
              titleOptional: '',
            });
            await syncService.flushQueue();
            setRawText('');
            setAssets([]);
            await onSaved();
          } finally {
            setBusy(false);
          }
        }}
      >
        {/* Input card with integrated toolbar */}
        <FileDropzone
          assets={assets}
          onAddAsset={addAsset}
        >
          <textarea
            aria-label="随便写点什么..."
            className="w-full bg-transparent text-base text-slate-800 placeholder:text-slate-400 outline-none resize-none min-h-[120px]"
            placeholder="随便写点什么..."
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
          />

          {/* Asset list inside card */}
          {assets.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {assets.map((asset) => (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-purple-100/60 text-purple-700 text-xs px-3 py-1"
                  key={`${asset.localPath ?? asset.base64Data ?? asset.fileName}-${asset.fileName}`}
                >
                  <Paperclip size={12} />
                  {asset.fileName}
                </span>
              ))}
            </div>
          ) : null}

          {/* Toolbar inside card */}
          <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <FileDropzone.PickerButton
                onClick={() => document.getElementById('capture-file-input')?.click()}
              />
              <ScreenshotButton onCaptured={addAsset} />
              <VoiceRecorder onRecorded={addAsset} />
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              disabled={busy || !hasContent}
              type="submit"
            >
              <Send size={16} />
              保存
            </button>
          </div>
        </FileDropzone>
      </form>

      {/* Quick action chips */}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button
          className="inline-flex items-center gap-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-white/80 px-4 py-1.5 text-sm text-slate-600 hover:bg-white/80 hover:text-slate-800 transition-all shadow-sm"
          onClick={() => {
            const el = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="随便写点什么..."]');
            el?.focus();
          }}
          type="button"
        >
          <PenLine size={14} />
          文字笔记
        </button>
        <button
          className="inline-flex items-center gap-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-white/80 px-4 py-1.5 text-sm text-slate-600 hover:bg-white/80 hover:text-slate-800 transition-all shadow-sm"
          onClick={() => document.getElementById('capture-file-input')?.click()}
          type="button"
        >
          <Paperclip size={14} />
          导入文件
        </button>
      </div>
    </div>
  );
}
