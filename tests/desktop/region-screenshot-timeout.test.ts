import { describe, expect, it, mock } from 'bun:test';

const invokedCommands: string[] = [];

mock.module('@tauri-apps/api/core', () => ({
  invoke: async (command: string) => {
    invokedCommands.push(command);
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

    const result = await requestRegionScreenshotWithTimeout(1);

    expect(result).toBeNull();
    expect(invokedCommands).toEqual(['show_screenshot_overlay', 'hide_screenshot_overlay']);
  });
});
