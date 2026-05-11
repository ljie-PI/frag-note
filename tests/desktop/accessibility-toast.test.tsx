import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import zhCN from '../../apps/desktop/src/i18n/zh-CN.json';

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : path;
}

const t = (key: string) => getNestedValue(zhCN as unknown as Record<string, unknown>, key);

type Listener = (event: { event: string; payload?: unknown }) => void;

const listeners = new Map<string, Listener[]>();
const invokedCommands: string[] = [];

mock.module('@tauri-apps/api/event', () => ({
  listen: mock(async (eventName: string, listener: Listener) => {
    const eventListeners = listeners.get(eventName) ?? [];
    eventListeners.push(listener);
    listeners.set(eventName, eventListeners);

    return () => {
      const remaining = (listeners.get(eventName) ?? []).filter(
        (candidate) => candidate !== listener,
      );
      if (remaining.length === 0) {
        listeners.delete(eventName);
      } else {
        listeners.set(eventName, remaining);
      }
    };
  }),
}));

mock.module('@tauri-apps/api/core', () => ({
  invoke: mock(async (commandName: string) => {
    invokedCommands.push(commandName);
  }),
}));

async function loadToastModule() {
  return import('../../apps/desktop/src/components/notice-toast.tsx');
}

function emit(eventName: string) {
  for (const listener of listeners.get(eventName) ?? []) {
    listener({ event: eventName });
  }
}

beforeEach(() => {
  listeners.clear();
  invokedCommands.length = 0;
});

describe('selection grab notice toast', () => {
  it('shows a macOS Accessibility permission toast when the backend emits accessibility-permission-needed', async () => {
    const { ShortcutNoticeToast, subscribeShortcutNoticeEvents } = await loadToastModule();
    const shownEvents = new Set<string>();
    let currentNotice = null;

    await subscribeShortcutNoticeEvents({
      shownEvents,
      setNotice: (notice) => {
        currentNotice = notice;
      },
      t,
    });

    emit('accessibility-permission-needed');

    const markup = renderToStaticMarkup(
      <ShortcutNoticeToast
        notice={currentNotice}
        onDismiss={() => {
          currentNotice = null;
        }}
      />,
    );

    expect(markup).toContain('需要辅助功能权限');
    expect(markup).toContain('去设置');
  });

  it('clicking the macOS Accessibility action opens the right settings command', async () => {
    const { runShortcutNoticeAction } = await loadToastModule();
    let dismissed = false;

    await runShortcutNoticeAction('accessibility-permission-needed', () => {
      dismissed = true;
    });

    expect(invokedCommands).toEqual(['open_macos_accessibility_settings']);
    expect(dismissed).toBe(true);
  });

  it('shows a Wayland clipboard fallback toast when the backend emits wayland-clipboard-fallback', async () => {
    const { ShortcutNoticeToast, subscribeShortcutNoticeEvents } = await loadToastModule();
    const shownEvents = new Set<string>();
    let currentNotice = null;

    await subscribeShortcutNoticeEvents({
      shownEvents,
      setNotice: (notice) => {
        currentNotice = notice;
      },
      t,
    });

    emit('wayland-clipboard-fallback');

    const markup = renderToStaticMarkup(
      <ShortcutNoticeToast
        notice={currentNotice}
        onDismiss={() => {
          currentNotice = null;
        }}
      />,
    );

    expect(markup).toContain('Wayland 限制');
    expect(markup).toContain('知道了');
  });

  it('dismisses the toast after the Wayland acknowledgement action', async () => {
    const { runShortcutNoticeAction } = await loadToastModule();
    let dismissed = false;

    await runShortcutNoticeAction('wayland-clipboard-fallback', () => {
      dismissed = true;
    });

    expect(invokedCommands).toEqual([]);
    expect(dismissed).toBe(true);
  });

  it('does not show duplicate toasts when the same event is emitted twice in one render', async () => {
    const { subscribeShortcutNoticeEvents } = await loadToastModule();
    const shownEvents = new Set<string>();
    const notices: unknown[] = [];

    await subscribeShortcutNoticeEvents({
      shownEvents,
      setNotice: (notice) => {
        notices.push(notice);
      },
      t,
    });

    emit('accessibility-permission-needed');
    emit('accessibility-permission-needed');

    expect(notices).toHaveLength(1);
  });
});
