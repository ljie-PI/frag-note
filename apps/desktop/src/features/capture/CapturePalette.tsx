import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Paperclip, Send } from 'lucide-react';
import type { CaptureStore } from './capture-store.ts';
import type { ReturnTypeOfCreateSyncService } from '../sync/types.ts';
import { FileDropzone } from './file-dropzone.tsx';
import { ScreenshotButton, captureScreenshot } from './screenshot-button.tsx';
import { VoiceRecorder } from './voice-recorder.tsx';
import { useVoiceRecorder } from './use-voice-recorder.ts';
import {
  persistLocalAssetPointer,
  type LocalAssetPointer,
} from '../storage/local-assets.ts';
import { useTranslation } from '../../i18n/LocaleContext.tsx';

export type CapturePaletteRef = {
  appendText: (text: string) => void;
  addAsset: (asset: LocalAssetPointer) => void;
  triggerScreenshot: () => Promise<void>;
  startRecording: () => Promise<void>;
  focusInput: () => void;
  isRecording: () => boolean;
};

type CapturePaletteProps = {
  store: CaptureStore;
  syncService?: ReturnTypeOfCreateSyncService | null;
  onSaved: () => Promise<void>;
  showGreeting?: boolean;
  cardClassName?: string;
  compact?: boolean;
  fillHeight?: boolean;
};

export const CapturePalette = forwardRef<CapturePaletteRef, CapturePaletteProps>(
  function CapturePalette({ store, syncService, onSaved, showGreeting = true, cardClassName, compact = false, fillHeight = false }, ref) {
    const { t } = useTranslation();
    const [rawText, setRawText] = useState('');
    const [busy, setBusy] = useState(false);
    const [assets, setAssets] = useState<LocalAssetPointer[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const addAsset = (asset: LocalAssetPointer) =>
      setAssets((current) => persistLocalAssetPointer(asset, current));

    const hasContent = rawText.trim().length > 0 || assets.length > 0;

    const { recording, toggleRecording, startRecording, stopRecording } = useVoiceRecorder(addAsset);

    useImperativeHandle(ref, () => ({
      appendText: (text: string) => {
        setRawText((prev) => prev ? `${prev}\n${text}` : text);
      },
      addAsset,
      triggerScreenshot: async () => {
        try {
          const asset = await captureScreenshot();
          if (asset) addAsset(asset);
        } catch {
          // Screenshot cancelled or failed
        }
      },
      startRecording,
      focusInput: () => {
        textareaRef.current?.focus();
      },
      isRecording: () => recording,
    }));

    const handleSubmit = async (event: React.FormEvent) => {
      event.preventDefault();
      if (!hasContent) return;
      if (recording) stopRecording();
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
        if (syncService) {
          await syncService.flushQueue();
        }
        setRawText('');
        setAssets([]);
        await onSaved();
      } finally {
        setBusy(false);
      }
    };

    const textareaClass = fillHeight
      ? 'w-full bg-transparent text-base text-slate-800 placeholder:text-slate-400 outline-none resize-none flex-1'
      : compact
        ? 'w-full bg-transparent text-base text-slate-800 placeholder:text-slate-400 outline-none resize-none min-h-[60px]'
        : 'w-full bg-transparent text-base text-slate-800 placeholder:text-slate-400 outline-none resize-none';

    const textareaStyle = !fillHeight && !compact
      ? { minHeight: 'clamp(120px, 18vh, 180px)' }
      : undefined;

    const form = (
      <form
        className={`w-full ${fillHeight ? 'h-full flex flex-col' : ''}`}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <FileDropzone
          assets={assets}
          onAddAsset={addAsset}
          cardClassName={cardClassName}
          fillHeight={fillHeight}
        >
          <textarea
            ref={textareaRef}
            aria-label={t('capture.placeholder')}
            className={textareaClass}
            style={textareaStyle}
            placeholder={t('capture.placeholder')}
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
          />

          {/* Asset list inside card */}
          {assets.length > 0 ? (
            <div className={`mt-2 flex flex-wrap gap-2 ${fillHeight ? 'overflow-y-auto max-h-[40px] shrink-0' : ''}`}>
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
          <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1">
              <FileDropzone.PickerButton
                onClick={() => document.getElementById('capture-file-input')?.click()}
              />
              <ScreenshotButton onCaptured={addAsset} />
              <VoiceRecorder recording={recording} onToggle={() => void toggleRecording()} />
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              disabled={busy || !hasContent}
              type="submit"
            >
              <Send size={16} />
              {t('capture.save')}
            </button>
          </div>
        </FileDropzone>
      </form>
    );

    if (!showGreeting) return form;

    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-2xl font-semibold text-slate-700 mb-6">{t('capture.greeting')}</h2>
        {form}
      </div>
    );
  },
);
