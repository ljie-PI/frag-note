import { useEffect, useMemo, useState, useRef, forwardRef, useImperativeHandle } from 'react';
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
import { notify } from '../../components/notice-toast.tsx';
import { useTranslation } from '../../i18n/LocaleContext.tsx';
import {
  debounce,
  publishDraft,
  publishSaved,
  subscribeDraft,
  subscribeSaved,
} from './draft-sync.ts';

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
    const skipNextDraftPublishRef = useRef(false);
    const isFirstPublishRef = useRef(true);
    const publishDraftDebounced = useMemo(
      () =>
        debounce((nextRawText: string, nextAssets: LocalAssetPointer[]) => {
          void publishDraft({ rawText: nextRawText, assets: nextAssets });
        }, 120),
      [],
    );

    const addAsset = (asset: LocalAssetPointer) =>
      setAssets((current) => persistLocalAssetPointer(asset, current));

    const hasContent = rawText.trim().length > 0 || assets.length > 0;

    const { recording, toggleRecording, startRecording, stopRecording } = useVoiceRecorder(addAsset);

    useEffect(() => {
      const applyRemoteDraft = (nextRawText: string, nextAssets: LocalAssetPointer[]) => {
        skipNextDraftPublishRef.current = true;
        setRawText(nextRawText);
        setAssets(nextAssets);
      };

      const unlistenDraft = subscribeDraft(({ rawText: nextRawText, assets: nextAssets }) => {
        applyRemoteDraft(nextRawText, nextAssets);
      });
      const unlistenSaved = subscribeSaved(() => {
        applyRemoteDraft('', []);
      });

      return () => {
        void unlistenDraft.then((fn) => fn());
        void unlistenSaved.then((fn) => fn());
        publishDraftDebounced.cancel();
      };
    }, [publishDraftDebounced]);

    useEffect(() => {
      if (skipNextDraftPublishRef.current) {
        skipNextDraftPublishRef.current = false;
        publishDraftDebounced.cancel();
        return;
      }
      if (isFirstPublishRef.current) {
        isFirstPublishRef.current = false;
        publishDraftDebounced.cancel();
        return;
      }
      publishDraftDebounced(rawText, assets);
    }, [rawText, assets, publishDraftDebounced]);

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
        } catch (error) {
          console.error('Failed to save fragment locally', error);
          notify('error', t('capture.saveError'));
          return;
        }

        publishDraftDebounced.cancel();
        skipNextDraftPublishRef.current = true;
        setRawText('');
        setAssets([]);
        await publishSaved();
        notify('success', t('capture.saveSuccess'));

        if (syncService) {
          try {
            await syncService.flushQueue();
          } catch (error) {
            console.error('Failed to sync fragment after save', error);
            notify('error', t('capture.saveSyncError'));
          }
        }

        try {
          await onSaved();
        } catch (error) {
          console.error('Failed after saving fragment', error);
        }
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
