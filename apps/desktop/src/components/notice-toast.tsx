import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { emit, emitTo, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useTranslation } from '../i18n/LocaleContext.tsx';

export type ShortcutNoticeEventName =
  | 'accessibility-permission-needed'
  | 'wayland-clipboard-fallback';

export type NoticeLevel = 'info' | 'success' | 'error';

export const GENERIC_NOTICE_EVENT_NAME = 'shortcut-notice' as const;
export const CLEAR_NOTICE_EVENT_NAME = 'shortcut-notice-clear' as const;

type GenericNoticeEventName = typeof GENERIC_NOTICE_EVENT_NAME;
type ClearNoticeEventName = typeof CLEAR_NOTICE_EVENT_NAME;

type NoticeEventName = ShortcutNoticeEventName | GenericNoticeEventName;
type NoticeListenEventName = NoticeEventName | ClearNoticeEventName;

export type ShortcutNotice = {
  eventName: NoticeEventName;
  level: NoticeLevel;
  title?: string;
  message: string;
  actionLabel?: string;
};

type Unlisten = () => void;
type ListenImpl = (
  eventName: NoticeListenEventName,
  handler: (event: unknown) => void,
) => Promise<Unlisten>;
type EmitImpl = (eventName: GenericNoticeEventName, payload: { level: NoticeLevel; message: string }) => Promise<unknown>;
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
    level: 'info',
    title: t(k.title),
    message: t(k.message),
    actionLabel: t(k.actionLabel),
  } satisfies ShortcutNotice;
}

function consumeGenericNoticeEvent(payload: unknown) {
  if (!isRecord(payload)) {
    return null;
  }

  const level = parseNoticeLevel(payload.level);
  if (!level || typeof payload.message !== 'string' || payload.message.trim().length === 0) {
    return null;
  }

  return {
    eventName: GENERIC_NOTICE_EVENT_NAME,
    level,
    message: payload.message,
  } satisfies ShortcutNotice;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseNoticeLevel(value: unknown): NoticeLevel | null {
  return value === 'info' || value === 'success' || value === 'error' ? value : null;
}

function eventPayload(event: unknown) {
  return isRecord(event) ? event.payload : undefined;
}

function emitNotice(
  eventName: GenericNoticeEventName,
  payload: { level: NoticeLevel; message: string },
) {
  return emit(eventName, payload);
}

export function notify(level: NoticeLevel, message: string, emitImpl: EmitImpl = emitNotice) {
  try {
    void Promise.resolve(emitImpl(GENERIC_NOTICE_EVENT_NAME, { level, message })).catch((error: unknown) => {
      console.error('Failed to emit notice', error);
    });
  } catch (error) {
    console.error('Failed to emit notice', error);
  }
}

export function clearNotice() {
  try {
    void emitTo(getCurrentWindow().label, CLEAR_NOTICE_EVENT_NAME).catch((error: unknown) => {
      console.error('Failed to clear notice', error);
    });
  } catch (error) {
    console.error('Failed to clear notice', error);
  }
}

export async function subscribeShortcutNoticeEvents({
  shownEvents,
  setNotice,
  t,
  listenImpl = listen as ListenImpl,
}: {
  shownEvents: Set<string>;
  setNotice: (notice: ShortcutNotice | null) => void;
  t: (key: string) => string;
  listenImpl?: ListenImpl;
}) {
  const unlisteners = await Promise.all([
    ...SHORTCUT_NOTICE_EVENT_NAMES.map((eventName) =>
      listenImpl(eventName, () => {
        const notice = consumeShortcutNoticeEvent(eventName, shownEvents, t);
        if (notice) {
          setNotice(notice);
        }
      }),
    ),
    listenImpl(GENERIC_NOTICE_EVENT_NAME, (event) => {
      const notice = consumeGenericNoticeEvent(eventPayload(event));
      if (notice) {
        setNotice(notice);
      }
    }),
    listenImpl(CLEAR_NOTICE_EVENT_NAME, () => {
      setNotice(null);
    }),
  ]);

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

const NOTICE_LEVEL_STYLES = {
  info: {
    Icon: Info,
    container: 'border-blue-200/80 bg-white/95',
    icon: 'text-blue-600',
  },
  success: {
    Icon: CheckCircle2,
    container: 'border-green-200/80 bg-green-50/95',
    icon: 'text-green-600',
  },
  error: {
    Icon: AlertCircle,
    container: 'border-red-200/80 bg-red-50/95',
    icon: 'text-red-600',
  },
} satisfies Record<NoticeLevel, { Icon: typeof Info; container: string; icon: string }>;

function isActionableNotice(
  notice: ShortcutNotice,
): notice is ShortcutNotice & { eventName: ShortcutNoticeEventName; actionLabel: string } {
  return notice.eventName !== GENERIC_NOTICE_EVENT_NAME && typeof notice.actionLabel === 'string';
}

function noticeAutoDismissMs(notice: ShortcutNotice | null) {
  if (!notice || notice.eventName !== GENERIC_NOTICE_EVENT_NAME) {
    return null;
  }

  return notice.level === 'error' ? 5000 : 3000;
}

export function scheduleNoticeAutoDismiss(
  notice: ShortcutNotice | null,
  onDismiss: () => void,
  setTimeoutImpl: (callback: () => void, delay: number) => ReturnType<typeof setTimeout> = setTimeout,
  clearTimeoutImpl: (timerId: ReturnType<typeof setTimeout>) => void = clearTimeout,
) {
  const delay = noticeAutoDismissMs(notice);
  if (delay === null) {
    return undefined;
  }

  const timerId = setTimeoutImpl(onDismiss, delay);
  return () => clearTimeoutImpl(timerId);
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

  const levelStyle = NOTICE_LEVEL_STYLES[notice.level];
  const Icon = levelStyle.Icon;
  const hasAction = isActionableNotice(notice);

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border p-4 text-stone-800 shadow-2xl backdrop-blur ${levelStyle.container}`}
      onClick={(event) => event.stopPropagation()}
      role={notice.level === 'error' ? 'alert' : 'status'}
    >
      <div className="flex gap-3 pr-8">
        <Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${levelStyle.icon}`} />
        <div className="space-y-1">
          {notice.title ? <p className="text-sm font-semibold">{notice.title}</p> : null}
          <p className={notice.title ? 'text-xs leading-5 text-stone-600' : 'text-sm font-medium text-stone-700'}>
            {notice.message}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        {hasAction ? (
          <button
            className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-700"
            onClick={() => void runShortcutNoticeAction(notice.eventName, onDismiss)}
            type="button"
          >
            {notice.actionLabel}
          </button>
        ) : null}
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

  useEffect(() => scheduleNoticeAutoDismiss(notice, () => setNotice(null)), [notice]);

  return (
    <ShortcutNoticeToast
      notice={notice}
      onDismiss={() => setNotice(null)}
    />
  );
}
