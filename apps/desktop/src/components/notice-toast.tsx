import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from '../i18n/LocaleContext.tsx';

export type ShortcutNoticeEventName =
  | 'accessibility-permission-needed'
  | 'wayland-clipboard-fallback';

export type ShortcutNotice = {
  eventName: ShortcutNoticeEventName;
  title: string;
  message: string;
  actionLabel: string;
};

type Unlisten = () => void;
type ListenImpl = (
  eventName: ShortcutNoticeEventName,
  handler: (event: unknown) => void,
) => Promise<Unlisten>;
type InvokeImpl = (commandName: string) => Promise<unknown>;

export const SHORTCUT_NOTICE_EVENT_NAMES: ShortcutNoticeEventName[] = [
  'accessibility-permission-needed',
  'wayland-clipboard-fallback',
];

export function consumeShortcutNoticeEvent(
  eventName: ShortcutNoticeEventName,
  shownEvents: Set<string>,
  t: (key: string) => string,
) {
  if (shownEvents.has(eventName)) {
    return null;
  }

  shownEvents.add(eventName);
  const keys: Record<ShortcutNoticeEventName, { title: string; message: string; actionLabel: string }> = {
    'accessibility-permission-needed': {
      title: 'notice.accessibilityTitle',
      message: 'notice.accessibilityMessage',
      actionLabel: 'notice.accessibilityAction',
    },
    'wayland-clipboard-fallback': {
      title: 'notice.waylandTitle',
      message: 'notice.waylandMessage',
      actionLabel: 'notice.waylandAction',
    },
  };
  const k = keys[eventName];
  return {
    eventName,
    title: t(k.title),
    message: t(k.message),
    actionLabel: t(k.actionLabel),
  } satisfies ShortcutNotice;
}

export async function subscribeShortcutNoticeEvents({
  shownEvents,
  setNotice,
  t,
  listenImpl = listen as ListenImpl,
}: {
  shownEvents: Set<string>;
  setNotice: (notice: ShortcutNotice) => void;
  t: (key: string) => string;
  listenImpl?: ListenImpl;
}) {
  const unlisteners = await Promise.all(
    SHORTCUT_NOTICE_EVENT_NAMES.map((eventName) =>
      listenImpl(eventName, () => {
        const notice = consumeShortcutNoticeEvent(eventName, shownEvents, t);
        if (notice) {
          setNotice(notice);
        }
      }),
    ),
  );

  return () => {
    for (const unlisten of unlisteners) {
      unlisten();
    }
  };
}

export async function runShortcutNoticeAction(
  eventName: ShortcutNoticeEventName,
  onDismiss: () => void,
  invokeImpl: InvokeImpl = invoke,
) {
  try {
    if (eventName === 'accessibility-permission-needed') {
      await invokeImpl('open_macos_accessibility_settings');
    }
  } finally {
    onDismiss();
  }
}

export function ShortcutNoticeToast({
  notice,
  onDismiss,
}: {
  notice: ShortcutNotice | null;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();

  if (!notice) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-stone-200/80 bg-white/95 p-4 text-stone-800 shadow-2xl backdrop-blur"
      onClick={(event) => event.stopPropagation()}
      role="status"
    >
      <div className="space-y-1 pr-8">
        <p className="text-sm font-semibold">{notice.title}</p>
        <p className="text-xs leading-5 text-stone-600">{notice.message}</p>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-700"
          onClick={() => void runShortcutNoticeAction(notice.eventName, onDismiss)}
          type="button"
        >
          {notice.actionLabel}
        </button>
        <button
          aria-label={t('notice.closeNotice')}
          className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-sm text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
          onClick={onDismiss}
          type="button"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function ShortcutNoticeToaster() {
  const { t } = useTranslation();
  const [notice, setNotice] = useState<ShortcutNotice | null>(null);
  const shownEvents = useRef(new Set<string>());

  useEffect(() => {
    let disposed = false;
    let cleanup: Unlisten | null = null;

    void subscribeShortcutNoticeEvents({
      shownEvents: shownEvents.current,
      setNotice,
      t,
    }).then((unlisten) => {
      if (disposed) {
        unlisten();
        return;
      }
      cleanup = unlisten;
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [t]);

  return (
    <ShortcutNoticeToast
      notice={notice}
      onDismiss={() => setNotice(null)}
    />
  );
}
