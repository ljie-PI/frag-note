import { describe, expect, it } from 'bun:test';
import { closeTitleBarWindow } from '../../apps/desktop/src/app/TitleBar.tsx';

describe('closeTitleBarWindow', () => {
  it('hides the current window instead of closing it', async () => {
    let hideCalls = 0;
    let closeCalls = 0;
    const win = {
      hide: async () => {
        hideCalls += 1;
      },
      close: async () => {
        closeCalls += 1;
      },
    };

    await closeTitleBarWindow(win);

    expect(hideCalls).toBe(1);
    expect(closeCalls).toBe(0);
  });
});
