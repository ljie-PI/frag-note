import { useEffect, useState } from 'react';
import { Minus, Square, X } from 'lucide-react';
import { useTranslation } from '../i18n/LocaleContext.tsx';

type CurrentWindow = Awaited<
  ReturnType<typeof import('@tauri-apps/api/window').getCurrentWindow>
>;

export function closeTitleBarWindow(win: Pick<CurrentWindow, 'hide'>) {
  return win.hide();
}

export function TitleBar() {
  const { t } = useTranslation();
  const [win, setWin] = useState<CurrentWindow | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/window').then((mod) => setWin(mod.getCurrentWindow()));
    }
  }, []);

  if (!win) return null;

  return (
    <div
      className="h-8 flex items-center select-none shrink-0"
      data-tauri-drag-region
    >
      <span
        className="ml-3 text-xs text-stone-400 pointer-events-none"
        data-tauri-drag-region
      >
        {t('app.name')}
      </span>
      <div className="flex-1" data-tauri-drag-region />
      <button
        className="h-8 w-10 inline-flex items-center justify-center text-stone-500 hover:bg-stone-200/80 transition-colors"
        onClick={() => win.minimize()}
        type="button"
      >
        <Minus size={14} />
      </button>
      <button
        className="h-8 w-10 inline-flex items-center justify-center text-stone-500 hover:bg-stone-200/80 transition-colors"
        onClick={() => win.toggleMaximize()}
        type="button"
      >
        <Square size={11} />
      </button>
      <button
        className="h-8 w-10 inline-flex items-center justify-center text-stone-500 hover:bg-red-500 hover:text-white transition-colors rounded-tr-xl"
        onClick={() => {
          void closeTitleBarWindow(win);
        }}
        type="button"
      >
        <X size={14} />
      </button>
    </div>
  );
}
