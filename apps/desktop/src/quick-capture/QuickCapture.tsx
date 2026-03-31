import { useEffect, useMemo, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { readText } from '@tauri-apps/plugin-clipboard-manager';
import { Paperclip, Send, X } from 'lucide-react';
import { createCaptureStore } from '../features/capture/capture-store.ts';
import { createDesktopAdapter } from '../lib/desktop-adapter.ts';
import { FileDropzone } from '../features/capture/file-dropzone.tsx';
import { ScreenshotButton } from '../features/capture/screenshot-button.tsx';
import { VoiceRecorder } from '../features/capture/voice-recorder.tsx';
import {
  persistLocalAssetPointer,
  type LocalAssetPointer,
} from '../features/storage/local-assets.ts';

export function QuickCapture() {
  const adapter = useMemo(() => createDesktopAdapter(), []);
  const store = useMemo(() => createCaptureStore({ adapter }), [adapter]);

  const [rawText, setRawText] = useState('');
  const [assets, setAssets] = useState<LocalAssetPointer[]>([]);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addAsset = (asset: LocalAssetPointer) =>
    setAssets((current) => persistLocalAssetPointer(asset, current));

  const hasContent = rawText.trim().length > 0 || assets.length > 0;

  const hideWindow = async () => {
    setRawText('');
    setAssets([]);
    setRecording(false);
    await getCurrentWindow().hide();
  };

  const handleSave = async () => {
    if (!hasContent) return;
    setBusy(true);
    try {
      await store.saveFragment({
        sourceType: assets.some((a) => a.mimeType.startsWith('audio/'))
          ? 'voice'
          : assets.some((a) => a.mimeType === 'application/pdf')
            ? 'pdf'
            : assets.some((a) => a.mimeType.startsWith('image/'))
              ? 'image'
              : 'text',
        rawText:
          assets.length > 0
            ? JSON.stringify({ rawText, assets })
            : rawText,
        titleOptional: '',
      });
      await hideWindow();
    } finally {
      setBusy(false);
    }
  };

  // Listen for events from global shortcuts
  useEffect(() => {
    const unlisten = listen<string>('quick-capture', async (event) => {
      const mode = event.payload;

      if (mode === 'clipboard') {
        try {
          const text = await readText();
          if (text) {
            setRawText((prev) => prev ? `${prev}\n${text}` : text);
          }
        } catch {
          // Clipboard empty or access denied
        }
        setTimeout(() => textareaRef.current?.focus(), 100);
      } else if (mode === 'screenshot') {
        // Trigger screenshot via the ScreenshotButton ref — handled by auto-trigger state
        setAutoScreenshot(true);
      } else if (mode === 'voice') {
        setRecording(true);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        void hideWindow();
      }
      // Ctrl+Enter or Cmd+Enter to save
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && hasContent) {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hasContent, rawText, assets]);

  // Auto-screenshot trigger
  const [autoScreenshot, setAutoScreenshot] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-white/90 backdrop-blur-xl rounded-xl overflow-hidden">
      {/* Drag region / title bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-stone-50/80" data-tauri-drag-region>
        <span className="text-sm font-medium text-stone-500" data-tauri-drag-region>快速记录</span>
        <button
          className="w-6 h-6 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-200/60 transition-colors"
          onClick={() => void hideWindow()}
          type="button"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-4 pb-4 overflow-hidden">
        <FileDropzone assets={assets} onAddAsset={addAsset}>
          <textarea
            ref={textareaRef}
            aria-label="快速记录"
            className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none resize-none min-h-[100px] flex-1"
            placeholder="随便写点什么..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />

          {/* Assets */}
          {assets.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {assets.map((asset) => (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-purple-50 text-purple-700 text-xs px-2.5 py-0.5"
                  key={`${asset.localPath ?? asset.base64Data ?? asset.fileName}-${asset.fileName}`}
                >
                  <Paperclip size={10} />
                  {asset.fileName}
                </span>
              ))}
            </div>
          ) : null}

          {/* Toolbar */}
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <FileDropzone.PickerButton
                onClick={() => document.getElementById('capture-file-input')?.click()}
              />
              <ScreenshotButton
                onCaptured={(asset) => {
                  addAsset(asset);
                  setAutoScreenshot(false);
                }}
              />
              <VoiceRecorder onRecorded={addAsset} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Ctrl+Enter 保存 · Esc 关闭</span>
              <button
                className="inline-flex items-center gap-1.5 rounded-full bg-purple-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                disabled={busy || !hasContent}
                onClick={() => void handleSave()}
                type="button"
              >
                <Send size={14} />
                保存
              </button>
            </div>
          </div>
        </FileDropzone>
      </div>
    </div>
  );
}
