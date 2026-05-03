import { beforeEach, describe, expect, it, mock } from 'bun:test';

let invokedCommands: string[] = [];
let showInvoked: Promise<void>;
let resolveShowInvoked: () => void;

beforeEach(() => {
  invokedCommands = [];
  showInvoked = new Promise((resolve) => {
    resolveShowInvoked = resolve;
  });
});

mock.module('@tauri-apps/api/core', () => ({
  invoke: async (command: string) => {
    invokedCommands.push(command);
    if (command === 'show_screenshot_overlay') {
      resolveShowInvoked();
    }
    return null;
  },
}));

mock.module('@tauri-apps/api/event', () => ({
  listen: async () => () => {},
}));

mock.module('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({ label: 'main' }),
}));

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
});
