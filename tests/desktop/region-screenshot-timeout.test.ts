import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { installTauriMocks } from './support/tauri-mocks.ts';

type TauriEventHandler = (event: { payload: Record<string, unknown> }) => void | Promise<void>;

let invokedCommands: string[] = [];
let invokedArgs: unknown[][] = [];
let showInvoked: Promise<void>;
let resolveShowInvoked: () => void;
let eventHandlers: Map<string, TauriEventHandler>;
let currentWindow: {
  label: string;
  isVisible: () => Promise<boolean>;
  hide: ReturnType<typeof mock<() => Promise<void>>>;
  show: ReturnType<typeof mock<() => Promise<void>>>;
  setFocus: ReturnType<typeof mock<() => Promise<void>>>;
};

beforeEach(() => {
  invokedCommands = [];
  invokedArgs = [];
  eventHandlers = new Map();
  showInvoked = new Promise((resolve) => {
    resolveShowInvoked = resolve;
  });
  currentWindow = {
    label: 'main',
    isVisible: async () => true,
    hide: mock(async () => {}),
    show: mock(async () => {}),
    setFocus: mock(async () => {}),
  };
});

installTauriMocks({
  invoke: async (...args: unknown[]) => {
    const cmd = String(args[0]);
    invokedCommands.push(cmd);
    invokedArgs.push(args);
    if (cmd === 'show_screenshot_overlay') {
      resolveShowInvoked();
    }
    return null;
  },
  listen: async (eventName: unknown, handler: unknown) => {
    eventHandlers.set(String(eventName), handler as TauriEventHandler);
    return () => eventHandlers.delete(String(eventName));
  },
  getCurrentWindow: () => currentWindow,
});

describe('requestRegionScreenshotWithTimeout', () => {
  it('hides the overlay before resolving a timed-out request', async () => {
    const { requestRegionScreenshotWithTimeout } = await import(
      '../../apps/desktop/src/features/capture/region-screenshot.ts'
    );

    const pendingResult = requestRegionScreenshotWithTimeout(25);
    await showInvoked;

    const result = await pendingResult;

    expect(result).toBeNull();
    expect(invokedCommands).toContain('hide_screenshot_overlay');
    expect(invokedCommands.indexOf('hide_screenshot_overlay')).toBeGreaterThan(
      invokedCommands.indexOf('show_screenshot_overlay'),
    );
  });

  it('resolves a captured request before awaiting caller restoration', async () => {
    const { requestRegionScreenshotWithTimeout } = await import(
      '../../apps/desktop/src/features/capture/region-screenshot.ts'
    );
    let finishRestore: (() => void) | undefined;
    currentWindow.show = mock(
      () =>
        new Promise<void>((resolve) => {
          finishRestore = resolve;
        }),
    );

    const pendingResult = requestRegionScreenshotWithTimeout(1_000);
    await showInvoked;

    const showArgs = invokedArgs.find(([command]) => command === 'show_screenshot_overlay');
    const requestId = (showArgs?.[1] as { requestId: string }).requestId;
    void eventHandlers.get('screenshot-captured')?.({
      payload: {
        requestId,
        base64Data: 'AAAA',
        width: 1,
        height: 1,
        mimeType: 'image/png',
      },
    });

    const result = await Promise.race([
      pendingResult,
      new Promise<'timed-out'>((resolve) => setTimeout(() => resolve('timed-out'), 25)),
    ]);

    expect(result).not.toBe('timed-out');
    expect(result).toMatchObject({ mimeType: 'image/png', base64Data: 'AAAA' });
    finishRestore?.();
  });

  it('does not show the overlay when hiding the caller fails', async () => {
    const { requestRegionScreenshotWithTimeout } = await import(
      '../../apps/desktop/src/features/capture/region-screenshot.ts'
    );
    const originalConsoleError = console.error;
    console.error = mock(() => {});
    currentWindow.hide = mock(async () => {
      throw new Error('hide failed');
    });

    try {
      const result = await requestRegionScreenshotWithTimeout(25);

      expect(result).toBeNull();
      expect(invokedCommands).not.toContain('show_screenshot_overlay');
    } finally {
      console.error = originalConsoleError;
    }
  });

  it('restores the caller when checking initial visibility fails', async () => {
    const { requestRegionScreenshotWithTimeout } = await import(
      '../../apps/desktop/src/features/capture/region-screenshot.ts'
    );
    currentWindow.isVisible = async () => {
      throw new Error('visibility unavailable');
    };

    const pendingResult = requestRegionScreenshotWithTimeout(1_000);
    await showInvoked;

    const showArgs = invokedArgs.find(([command]) => command === 'show_screenshot_overlay');
    const requestId = (showArgs?.[1] as { requestId: string }).requestId;
    void eventHandlers.get('screenshot-cancelled')?.({ payload: { requestId } });

    const result = await pendingResult;
    await Promise.resolve();

    expect(result).toBeNull();
    expect(currentWindow.show).toHaveBeenCalledTimes(1);
    expect(currentWindow.setFocus).toHaveBeenCalledTimes(1);
  });
});
