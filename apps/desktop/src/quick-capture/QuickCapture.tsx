import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Paperclip, Send } from 'lucide-react';
import { createCaptureStore } from '../features/capture/capture-store.ts';
import { createDesktopAdapter } from '../lib/desktop-adapter.ts';
import { captureScreenshot } from '../features/capture/screenshot-button.tsx';
import { useVoiceRecorder } from '../features/capture/use-voice-recorder.ts';
import {
  persistLocalAssetPointer,
  type LocalAssetPointer,
} from '../features/storage/local-assets.ts';

const ANIM_DURATION = 200;

export function QuickCapture() {
  const adapter = useMemo(() => createDesktopAdapter(), []);
  const store = useMemo(() => createCaptureStore({ adapter }), [adapter]);

  const [rawText, setRawText] = useState('');
  const [assets, setAssets] = useState<LocalAssetPointer[]>([]);
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const closingRef = useRef(false);

  const addAsset = (asset: LocalAssetPointer) =>
    setAssets((current) => persistLocalAssetPointer(asset, current));

  const hasContent = rawText.trim().length > 0 || assets.length > 0;

  const { recording, stopRecording, startRecording } = useVoiceRecorder((asset) => {
    addAsset(asset);
  });

  const hideWindow = useCallback(async () => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (recording) stopRecording();
    setVisible(false);
    await new Promise((r) => setTimeout(r, ANIM_DURATION));
    setRawText('');
    setAssets([]);
    await getCurrentWindow().hide();
    closingRef.current = false;
  }, [recording, stopRecording]);

  const handleSave = useCallback(async () => {
    if (!hasContent || busy) return;
    if (recording) stopRecording();
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
  }, [hasContent, busy, recording, rawText, assets, store, hideWindow, stopRecording]);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  };

  // Animate in on window focus, close on blur
  useEffect(() => {
    const unlisten = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      if (focused && !closingRef.current) {
        setVisible(true);
        setTimeout(() => textareaRef.current?.focus(), 50);
      } else if (!focused && !recording) {
        void hideWindow();
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [recording, hideWindow]);

  // Listen for content from global shortcuts
  useEffect(() => {
    const unlisten = listen<{ mode: string; text: string }>('quick-capture', async (event) => {
      const { mode, text } = event.payload;
      closingRef.current = false;

      if (mode === 'clipboard') {
        if (text) {
          setRawText((prev) => prev ? `${prev}\n${text}` : text);
        }
        setTimeout(() => {
          textareaRef.current?.focus();
          adjustTextareaHeight();
        }, 50);
      } else if (mode === 'screenshot') {
        try {
          const asset = await captureScreenshot();
          addAsset(asset);
        } catch {
          // Screenshot cancelled or failed
        }
        setTimeout(() => textareaRef.current?.focus(), 50);
      } else if (mode === 'voice') {
        try {
          await startRecording();
        } catch {
          // Microphone access denied
        }
      }
    });

    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // Keyboard: Escape to close, Enter to save, Shift+Enter for newline
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        void hideWindow();
      }
      if (e.key === 'Enter' && !e.shiftKey && hasContent && !busy) {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hasContent, busy, hideWindow, handleSave]);

  return (
    <div className="p-2">
      <div
        className={`transition-all ease-out ${
          visible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-3'
        }`}
        style={{ transitionDuration: `${ANIM_DURATION}ms` }}
      >
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 shadow-lg p-4 focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-100 transition-colors">
          {/* Asset chips */}
          {assets.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-2">
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

          {/* Recording indicator */}
          {recording ? (
            <div className="flex items-center gap-2 text-xs text-red-600 mb-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              录音中… 按 Enter 保存
            </div>
          ) : null}

          {/* Input */}
          <textarea
            ref={textareaRef}
            aria-label="快速记录"
            className="w-full bg-transparent text-base text-slate-800 placeholder:text-slate-400 outline-none resize-none min-h-[60px]"
            placeholder="随便写点什么..."
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              adjustTextareaHeight();
            }}
          />

          {/* Footer */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60">
            <span className="text-[10px] text-stone-400 select-none">Enter 保存 · Shift+Enter 换行 · Esc 关闭</span>
            {hasContent ? (
              <button
                className="inline-flex items-center gap-1.5 rounded-full bg-purple-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                disabled={busy}
                onClick={() => void handleSave()}
                type="button"
              >
                <Send size={14} />
                保存
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
