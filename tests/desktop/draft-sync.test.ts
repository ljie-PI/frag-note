import { afterEach, describe, expect, it, mock } from 'bun:test';

const emitted: Array<{ event: string; payload: unknown }> = [];
const listeners = new Map<string, Set<(event: { payload: unknown }) => void>>();
let currentLabel = 'main';
let listenCalls = 0;

mock.module('@tauri-apps/api/event', () => ({
  emit: async (event: string, payload: unknown) => {
    emitted.push({ event, payload });
    for (const handler of listeners.get(event) ?? []) {
      handler({ payload });
    }
  },
  listen: async (event: string, handler: (event: { payload: unknown }) => void) => {
    listenCalls += 1;
    const eventListeners = listeners.get(event) ?? new Set();
    eventListeners.add(handler);
    listeners.set(event, eventListeners);

    return () => {
      eventListeners.delete(handler);
    };
  },
}));

mock.module('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({ label: currentLabel }),
}));

import {
  areDraftsEqual,
  debounce,
  publishDraft,
  publishSaved,
  subscribeDraft,
  subscribeSaved,
} from '../../apps/desktop/src/features/capture/draft-sync.ts';
import type { LocalAssetPointer } from '../../apps/desktop/src/features/storage/local-assets.ts';

const originalWindow = globalThis.window;

afterEach(() => {
  emitted.length = 0;
  listeners.clear();
  currentLabel = 'main';
  listenCalls = 0;

  if (originalWindow) {
    globalThis.window = originalWindow;
  } else {
    Reflect.deleteProperty(globalThis, 'window');
  }
});

describe('capture draft sync', () => {
  it('publishes draft updates with the current window label and ignores own updates', async () => {
    installTauriRuntime();
    const received: unknown[] = [];

    const unlisten = await subscribeDraft((payload) => received.push(payload));
    await publishDraft({ rawText: 'from main', assets: [] });

    expect(emitted).toEqual([
      {
        event: 'capture-draft:update',
        payload: { rawText: 'from main', assets: [], sourceLabel: 'main' },
      },
    ]);
    expect(received).toEqual([]);

    const asset: LocalAssetPointer = {
      fileName: 'voice.webm',
      mimeType: 'audio/webm',
      byteSize: 42,
      localPath: 'assets/voice.webm',
    };
    currentLabel = 'quick-capture';
    await publishDraft({ rawText: 'from quick', assets: [asset] });

    expect(received).toEqual([
      { rawText: 'from quick', assets: [asset], sourceLabel: 'quick-capture' },
    ]);

    unlisten();
  });

  it('publishes saved events and filters own saved notifications', async () => {
    installTauriRuntime();
    const received: unknown[] = [];

    const unlisten = await subscribeSaved((payload) => received.push(payload));
    await publishSaved();

    expect(emitted).toEqual([
      {
        event: 'capture-draft:saved',
        payload: { sourceLabel: 'main' },
      },
    ]);
    expect(received).toEqual([]);

    currentLabel = 'quick-capture';
    await publishSaved();

    expect(received).toEqual([{ sourceLabel: 'quick-capture' }]);

    unlisten();
  });

  it('ignores malformed draft event payloads', async () => {
    installTauriRuntime();
    const received: unknown[] = [];

    const unlisten = await subscribeDraft((payload) => received.push(payload));
    emitRaw('capture-draft:update', { sourceLabel: 'quick-capture', rawText: 123, assets: [] });
    emitRaw('capture-draft:update', { sourceLabel: 'quick-capture', rawText: 'bad', assets: [null] });
    emitRaw('capture-draft:update', { sourceLabel: 'quick-capture', rawText: 'bad', assets: [{}] });
    emitRaw('capture-draft:update', { sourceLabel: 'quick-capture', rawText: 'valid', assets: [] });

    expect(received).toEqual([
      { sourceLabel: 'quick-capture', rawText: 'valid', assets: [] },
    ]);

    unlisten();
  });

  it('uses no-op publish and subscribe functions outside Tauri', async () => {
    Reflect.deleteProperty(globalThis, 'window');

    await publishDraft({ rawText: 'browser', assets: [] });
    await publishSaved();
    const unlistenDraft = await subscribeDraft(() => {
      throw new Error('draft handler should not run outside Tauri');
    });
    const unlistenSaved = await subscribeSaved(() => {
      throw new Error('saved handler should not run outside Tauri');
    });

    unlistenDraft();
    unlistenSaved();

    expect(emitted).toEqual([]);
    expect(listenCalls).toBe(0);
  });

  it('debounces calls and keeps the latest arguments', async () => {
    const calls: Array<[string, number]> = [];
    const debounced = debounce((text: string, count: number) => {
      calls.push([text, count]);
    }, 10);

    debounced('first', 1);
    debounced('second', 2);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(calls).toEqual([['second', 2]]);
  });

  it('cancels pending debounced calls', async () => {
    const calls: string[] = [];
    const debounced = debounce((text: string) => {
      calls.push(text);
    }, 10);

    debounced('stale draft');
    debounced.cancel();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(calls).toEqual([]);
  });

  it('compares draft payload contents instead of asset array identity', () => {
    const asset: LocalAssetPointer = {
      fileName: 'screenshot.png',
      mimeType: 'image/png',
      byteSize: 42,
      base64Data: 'abc',
    };

    expect(areDraftsEqual('same', [{ ...asset }], 'same', [{ ...asset }])).toBe(true);
    expect(areDraftsEqual('same', [asset], 'different', [asset])).toBe(false);
    expect(areDraftsEqual('same', [asset], 'same', [{ ...asset, byteSize: 43 }])).toBe(false);
  });
});

function emitRaw(event: string, payload: unknown) {
  for (const handler of listeners.get(event) ?? []) {
    handler({ payload });
  }
}

function installTauriRuntime() {
  globalThis.window = {
    ...((originalWindow ?? {}) as Window),
    __TAURI_INTERNALS__: {},
  } as Window & { __TAURI_INTERNALS__: Record<string, never> };
}
