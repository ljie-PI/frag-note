import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from '../i18n/LocaleContext.tsx';
import zhCN from '../i18n/zh-CN.json';

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

// Default translation function using zh-CN as fallback
function defaultT(key: string): string {
  const keys = key.split('.');
  let current: unknown = zhCN;
  for (const k of keys) {
    if (current === null || current === undefined || typeof current !== 'object') return key;
    current = (current as Record<string, unknown>)[k];
  }
  return typeof current === 'string' ? current : key;
}

// Translation keys for each notice event
const NOTICE_KEYS: Record<ShortcutNoticeEventName, { title: string; message: string; actionLabel: string }> = {
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

export function createShortcutNoticeCopy(t: (key: string) => string = defaultT): Record<ShortcutNoticeEventName, ShortcutNotice> {
  return {
    'accessibility-permission-needed': {
      eventName: 'accessibility-permission-needed',
      title: t(NOTICE_KEYS['accessibility-permission-needed'].title),
      message: t(NOTICE_KEYS['accessibility-permission-needed'].message),
      actionLabel: t(NOTICE_KEYS['accessibility-permission-needed'].actionLabel),
    },
    'wayland-clipboard-fallback': {
      eventName: 'wayland-clipboard-fallback',
      title: t(NOTICE_KEYS['wayland-clipboard-fallback'].title),
      message: t(NOTICE_KEYS['wayland-clipboard-fallback'].message),
      actionLabel: t(NOTICE_KEYS['wayland-clipboard-fallback'].actionLabel),
    },
  };
}

export const SHORTCUT_NOTICE_EVENT_NAMES = Object.keys(
  NOTICE_KEYS,
) as ShortcutNoticeEventName[];

export function consumeShortcutNoticeEvent(
  eventName: ShortcutNoticeEventName,
  shownEvents: Set<string>,
  t: (key: string) => string = defaultT,
) {
  if (shownEvents.has(eventName)) {
    return null;
  }

  shownEvents.add(eventName);
  return createShortcutNoticeCopy(t)[eventName];
}

export async function subscribeShortcutNoticeEvents({
  shownEvents,
  setNotice,
  t = defaultT,
  listenImpl = listen as ListenImpl,
}: {
  shownEvents: Set<string>;
  setNotice: (notice: ShortcutNotice) => void;
  t?: (key: string) => string;
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
          aria-label="Close"
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
