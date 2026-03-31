import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { createCaptureStore } from '../features/capture/capture-store.ts';
import { createDesktopAdapter } from '../lib/desktop-adapter.ts';
import { CapturePalette, type CapturePaletteRef } from '../features/capture/CapturePalette.tsx';

const ANIM_DURATION = 200;

// Same card style as main CapturePalette but without the visible border
const QC_CARD_CLASS =
  'bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg p-5 transition-colors focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-100';

export function QuickCapture() {
  const adapter = useMemo(() => createDesktopAdapter(), []);
  const store = useMemo(() => createCaptureStore({ adapter }), [adapter]);
  const paletteRef = useRef<CapturePaletteRef>(null);

  const [visible, setVisible] = useState(false);
  const closingRef = useRef(false);

  const hideWindow = useCallback(async () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    await new Promise((r) => setTimeout(r, ANIM_DURATION));
    await getCurrentWindow().hide();
    closingRef.current = false;
  }, []);

  // Animate in on window focus, close on blur
  useEffect(() => {
    const unlisten = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      if (focused && !closingRef.current) {
        setVisible(true);
        setTimeout(() => paletteRef.current?.focusInput(), 50);
      } else if (!focused && !paletteRef.current?.isRecording()) {
        void hideWindow();
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [hideWindow]);

  // Listen for content from global shortcuts
  useEffect(() => {
    const unlisten = listen<{ mode: string; text: string }>('quick-capture', async (event) => {
      const { mode, text } = event.payload;
      closingRef.current = false;

      if (mode === 'clipboard') {
        if (text) paletteRef.current?.appendText(text);
        setTimeout(() => paletteRef.current?.focusInput(), 50);
      } else if (mode === 'screenshot') {
        await paletteRef.current?.triggerScreenshot();
        setTimeout(() => paletteRef.current?.focusInput(), 50);
      } else if (mode === 'voice') {
        await paletteRef.current?.startRecording();
      }
    });

    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void hideWindow();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hideWindow]);

  return (
    <div
      className="p-2 capture-bg rounded-2xl overflow-hidden h-full"
      onClick={() => void hideWindow()}
    >
      <div
        className={`transition-all ease-out ${
          visible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-3'
        }`}
        style={{ transitionDuration: `${ANIM_DURATION}ms` }}
        onClick={(e) => e.stopPropagation()}
      >
        <CapturePalette
          ref={paletteRef}
          store={store}
          syncService={null}
          onSaved={hideWindow}
          showGreeting={false}
          cardClassName={QC_CARD_CLASS}
          compact
        />
      </div>
    </div>
  );
}
