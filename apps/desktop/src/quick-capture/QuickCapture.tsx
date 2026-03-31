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

const ANIM_DURATION = 250;

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
    // Wait for slide-down animation before hiding
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

  // Listen for events from global shortcuts
  useEffect(() => {
    const unlisten = listen<{ mode: string; text: string }>('quick-capture', async (event) => {
      const { mode, text } = event.payload;
      closingRef.current = false;

      // Show with animation
      setVisible(true);

      if (mode === 'clipboard') {
        if (text) {
          setRawText((prev) => prev ? `${prev}\n${text}` : text);
        }
        setTimeout(() => {
          textareaRef.current?.focus();
          adjustTextareaHeight();
        }, 100);
      } else if (mode === 'screenshot') {
        try {
          const asset = await captureScreenshot();
          addAsset(asset);
        } catch {
          // Screenshot cancelled or failed
        }
        setTimeout(() => textareaRef.current?.focus(), 100);
      } else if (mode === 'voice') {
        try {
          await startRecording();
        } catch {
          // Microphone access denied
        }
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Close on window blur (click outside)
  useEffect(() => {
    const unlisten = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      if (!focused && visible && !recording) {
        void hideWindow();
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [visible, recording, hideWindow]);

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
    <div className="h-screen flex items-end justify-center px-4 pb-4">
      <div
        className={`w-full max-w-lg transition-all ease-out ${
          visible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-full opacity-0'
        }`}
        style={{ transitionDuration: `${ANIM_DURATION}ms` }}
      >
        <div className="bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-black/15 border border-white/40 px-4 py-3">
          {/* Asset chips */}
          {assets.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-2">
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

          {/* Recording indicator */}
          {recording ? (
            <div className="flex items-center gap-2 text-xs text-red-600 mb-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              录音中… 按 Enter 保存
            </div>
          ) : null}

          {/* Input area */}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              aria-label="快速记录"
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none resize-none leading-relaxed"
              placeholder="记点什么…"
              rows={1}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                adjustTextareaHeight();
              }}
            />
            {hasContent ? (
              <button
                className="shrink-0 w-7 h-7 inline-flex items-center justify-center rounded-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 transition-colors"
                disabled={busy}
                onClick={() => void handleSave()}
                type="button"
              >
                <Send size={14} />
              </button>
            ) : null}
          </div>

          {/* Hint */}
          <div className="text-[10px] text-stone-400 mt-1.5 select-none">
            Enter 保存 · Shift+Enter 换行 · Esc 关闭
          </div>
        </div>
      </div>
    </div>
  );
}
