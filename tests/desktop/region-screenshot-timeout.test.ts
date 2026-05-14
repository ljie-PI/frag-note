import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { installTauriMocks } from './support/tauri-mocks.ts';

type TauriEventHandler = (event: { payload: Record<string, unknown> }) => void | Promise<void>;
type TauriUnlisten = () => boolean;

let invokedCommands: string[] = [];
let invokedArgs: unknown[][] = [];
let showInvoked: Promise<void>;
let resolveShowInvoked: () => void;
let eventHandlers: Map<string, TauriEventHandler>;
let delayListenerRegistration = false;
let releaseListenerRegistrations: Array<() => void> = [];
let windowEvents: string[] = [];
let operationEvents: string[] = [];
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
  delayListenerRegistration = false;
  releaseListenerRegistrations = [];
  windowEvents = [];
  operationEvents = [];
  showInvoked = new Promise((resolve) => {
    resolveShowInvoked = resolve;
  });
  currentWindow = {
    label: 'main',
    isVisible: async () => true,
    hide: mock(async () => {
      windowEvents.push('hide');
      operationEvents.push('window:hide');
    }),
    show: mock(async () => {
      windowEvents.push('show');
      operationEvents.push('window:show');
    }),
    setFocus: mock(async () => {
      windowEvents.push('focus');
      operationEvents.push('window:focus');
    }),
  };
});

installTauriMocks({
  invoke: async (...args: unknown[]) => {
    const cmd = String(args[0]);
    invokedCommands.push(cmd);
    invokedArgs.push(args);
    operationEvents.push(`invoke:${cmd}`);
    if (cmd === 'show_screenshot_overlay') {
      resolveShowInvoked();
    }
    return null;
  },
  listen: async (eventName: unknown, handler: unknown) => {
    const register = () => {
      eventHandlers.set(String(eventName), handler as TauriEventHandler);
      return () => eventHandlers.delete(String(eventName));
    };

    if (!delayListenerRegistration) return register();

    return new Promise<TauriUnlisten>((resolve) => {
      releaseListenerRegistrations.push(() => resolve(register()));
    });
  },
  getCurrentWindow: () => currentWindow,
});

async function flushAsyncWork() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

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

  it('does not show the overlay if the request times out before listeners finish registering', async () => {
    const { requestRegionScreenshotWithTimeout } = await import(
      '../../apps/desktop/src/features/capture/region-screenshot.ts'
    );
    delayListenerRegistration = true;

    const result = await requestRegionScreenshotWithTimeout(25);
    for (const release of releaseListenerRegistrations) {
      release();
    }
    await flushAsyncWork();

    expect(result).toBeNull();
    expect(currentWindow.hide).not.toHaveBeenCalled();
    expect(invokedCommands).not.toContain('show_screenshot_overlay');
  });

  it('does not show the overlay and restores the caller if timeout fires while hiding', async () => {
    const { requestRegionScreenshotWithTimeout } = await import(
      '../../apps/desktop/src/features/capture/region-screenshot.ts'
    );
    let finishHide: (() => void) | undefined;
    const hideStarted = new Promise<void>((resolve) => {
      currentWindow.hide = mock(
        () =>
          new Promise<void>((hideResolve) => {
            operationEvents.push('window:hide:start');
            resolve();
            finishHide = () => {
              operationEvents.push('window:hide:finish');
              hideResolve();
            };
          }),
      );
    });

    const pendingResult = requestRegionScreenshotWithTimeout(25);
    await hideStarted;

    const result = await pendingResult;
    finishHide?.();
    await flushAsyncWork();

    expect(result).toBeNull();
    expect(invokedCommands).not.toContain('show_screenshot_overlay');
    expect(operationEvents.lastIndexOf('window:show')).toBeGreaterThan(
      operationEvents.indexOf('window:hide:finish'),
    );
  });

  it('resolves a captured request before closing the overlay and restoring the caller', async () => {
    const { requestRegionScreenshotWithTimeout } = await import(
      '../../apps/desktop/src/features/capture/region-screenshot.ts'
    );
    let finishRestore: (() => void) | undefined;
    currentWindow.show = mock(
      () =>
        new Promise<void>((resolve) => {
          operationEvents.push('window:show');
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
    await flushAsyncWork();

    expect(result).not.toBe('timed-out');
    expect(result).toMatchObject({ mimeType: 'image/png', base64Data: 'AAAA' });
    expect(operationEvents.indexOf('invoke:hide_screenshot_overlay')).toBeGreaterThan(
      operationEvents.indexOf('invoke:show_screenshot_overlay'),
    );
    expect(operationEvents.indexOf('window:show')).toBeGreaterThan(
      operationEvents.indexOf('invoke:hide_screenshot_overlay'),
    );
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
    await flushAsyncWork();

    expect(result).toBeNull();
    expect(currentWindow.show).toHaveBeenCalledTimes(1);
    expect(currentWindow.setFocus).toHaveBeenCalledTimes(1);
  });
});
