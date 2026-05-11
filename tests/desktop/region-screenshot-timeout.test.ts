import { beforeEach, describe, expect, it } from 'bun:test';
import { installTauriMocks } from './support/tauri-mocks.ts';

let invokedCommands: string[] = [];
let showInvoked: Promise<void>;
let resolveShowInvoked: () => void;

beforeEach(() => {
  invokedCommands = [];
  showInvoked = new Promise((resolve) => {
    resolveShowInvoked = resolve;
  });
});

installTauriMocks({
  invoke: async (command: unknown) => {
    const cmd = String(command);
    invokedCommands.push(cmd);
    if (cmd === 'show_screenshot_overlay') {
      resolveShowInvoked();
    }
    return null;
  },
  getCurrentWindow: () => ({ label: 'main' }),
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
});
