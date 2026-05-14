import { afterEach, describe, expect, it, mock } from 'bun:test';
import { Window } from 'happy-dom';
import type { Root } from 'react-dom/client';
import type { CaptureStore } from '../../apps/desktop/src/features/capture/capture-store.ts';
import type { CapturePaletteRef } from '../../apps/desktop/src/features/capture/CapturePalette.tsx';

type Listener = (event: { payload: unknown }) => void;

const emitted: Array<{ event: string; payload: unknown }> = [];
const listeners = new Map<string, Set<Listener>>();
let currentLabel = 'main';

mock.module('@tauri-apps/api/event', () => ({
  emit: async (event: string, payload: unknown) => {
    emitted.push({ event, payload });
    for (const handler of listeners.get(event) ?? []) {
      handler({ payload });
    }
  },
  listen: async (event: string, handler: Listener) => {
    const eventListeners = listeners.get(event) ?? new Set<Listener>();
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

import { CapturePalette } from '../../apps/desktop/src/features/capture/CapturePalette.tsx';

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalNavigator = globalThis.navigator;
const originalHTMLElement = globalThis.HTMLElement;
const originalEvent = globalThis.Event;
const originalActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;

let root: Root | null = null;
let reactModule: typeof import('react') | null = null;
let reactDomClientModule: typeof import('react-dom/client') | null = null;

afterEach(async () => {
  if (root) {
    const { act } = await loadReact();
    await act(async () => {
      root?.unmount();
    });
  }
  root = null;
  emitted.length = 0;
  listeners.clear();
  currentLabel = 'main';
  restoreDom();
});

describe('CapturePalette draft sync behavior', () => {
  it('does not echo a remote draft, then publishes the next local edit', async () => {
    const { container, paletteRef } = await renderPalette();
    await wait(180);
    expect(captureDraftUpdates()).toEqual([]);

    const { act } = await loadReact();
    await act(async () => {
      emitRaw('capture-draft:update', {
        sourceLabel: 'quick-capture',
        rawText: 'remote draft',
        assets: [],
      });
    });
    await wait(180);

    const textarea = container.getElementsByTagName('textarea').item(0) as HTMLTextAreaElement;
    expect(paletteRef.current).not.toBeNull();
    expect(textarea.value).toBe('remote draft');
    expect(captureDraftUpdates()).toEqual([]);

    await act(async () => {
      paletteRef.current?.appendText('local edit');
    });
    await wait(180);

    expect(captureDraftUpdates()).toEqual([
      {
        event: 'capture-draft:update',
        payload: {
          sourceLabel: 'main',
          rawText: 'remote draft\nlocal edit',
          assets: [],
        },
      },
    ]);
  });

  it('does not publish an empty draft on first mount', async () => {
    await renderPalette();
    await wait(180);

    expect(captureDraftUpdates()).toEqual([]);
  });
});

async function renderPalette() {
  installDom();
  currentLabel = 'main';
  const container = document.createElement('div');
  document.body.appendChild(container);
  const { act, createElement, createRef } = await loadReact();
  const { createRoot } = await loadReactDomClient();
  root = createRoot(container);
  const paletteRef = createRef<CapturePaletteRef>();

  await act(async () => {
    root?.render(createElement(CapturePalette, {
      ref: paletteRef,
      store: createStoreStub(),
      syncService: null,
      onSaved: async () => {},
      showGreeting: false,
    }));
  });

  return { container, paletteRef };
}

function emitRaw(event: string, payload: unknown) {
  for (const handler of listeners.get(event) ?? []) {
    handler({ payload });
  }
}

function captureDraftUpdates() {
  return emitted.filter((entry) => entry.event === 'capture-draft:update');
}

function createStoreStub(): CaptureStore {
  return {
    async saveFragment() {
      throw new Error('saveFragment is not used by these tests');
    },
    async listFragments() {
      return [];
    },
    async listRecords() {
      return [];
    },
    async getFragment() {
      return null;
    },
    async updateRecord() {},
  } as CaptureStore;
}

function installDom() {
  const window = new Window();
  Object.defineProperty(window, '__TAURI_INTERNALS__', { value: {}, configurable: true });
  globalThis.window = window as unknown as Window & typeof globalThis;
  globalThis.document = window.document as unknown as Document;
  globalThis.navigator = window.navigator as unknown as Navigator;
  globalThis.HTMLElement = window.HTMLElement as unknown as typeof HTMLElement;
  globalThis.Event = window.Event as unknown as typeof Event;
  window.SyntaxError = SyntaxError;
}

function restoreDom() {
  if (originalWindow) {
    globalThis.window = originalWindow;
  } else {
    Reflect.deleteProperty(globalThis, 'window');
  }
  if (originalDocument) {
    globalThis.document = originalDocument;
  } else {
    Reflect.deleteProperty(globalThis, 'document');
  }
  if (originalNavigator) {
    globalThis.navigator = originalNavigator;
  } else {
    Reflect.deleteProperty(globalThis, 'navigator');
  }
  if (originalHTMLElement) {
    globalThis.HTMLElement = originalHTMLElement;
  } else {
    Reflect.deleteProperty(globalThis, 'HTMLElement');
  }
  if (originalEvent) {
    globalThis.Event = originalEvent;
  } else {
    Reflect.deleteProperty(globalThis, 'Event');
  }
  if (originalActEnvironment === undefined) {
    Reflect.deleteProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
  } else {
    globalThis.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
  }
}

async function wait(delayMs: number) {
  const { act } = await loadReact();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  });
}

async function loadReact() {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  reactModule ??= await import('react');
  return reactModule;
}

async function loadReactDomClient() {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  reactDomClientModule ??= await import('react-dom/client');
  return reactDomClientModule;
}
