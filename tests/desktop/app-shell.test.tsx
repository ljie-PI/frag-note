import { afterEach, describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { App } from '../../apps/desktop/src/app/App.tsx';
import type { ExtendedDesktopApiClient } from '../../apps/desktop/src/lib/api-client.ts';

const originalLocalStorage = globalThis.localStorage;

afterEach(() => {
  if (originalLocalStorage) {
    globalThis.localStorage = originalLocalStorage;
  } else {
    Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

function createDesktopApiClientStub(): ExtendedDesktopApiClient {
  return {
    async ingestFragment(payload) {
      return {
        fragmentId: payload.fragmentId,
        status: 'processing',
      };
    },
    async getFragmentDetail() {
      return null;
    },
    async retryFragmentProcessing(fragmentId) {
      return {
        fragmentId,
        status: 'processing',
      };
    },
    async listCandidates() {
      return [];
    },
    async reviewCandidate() {
      throw new Error('not implemented in render test');
    },
    async search() {
      throw new Error('not implemented in render test');
    },
    async saveAnswerAsFragment() {
      throw new Error('not implemented in render test');
    },
  };
}

describe('desktop app shell', () => {
  it('renders capture, recent fragments, organization, and search surfaces', () => {
    const markup = renderToStaticMarkup(
      <App apiClient={createDesktopApiClientStub()} />,
    );

    expect(markup).toContain('保存');
    expect(markup).toContain('碎片');
    expect(markup).toContain('整理');
    expect(markup).toContain('搜索');
  });

  it('migrates the legacy sui-note sidebar width key to the frag-note key', () => {
    const storage = installMemoryLocalStorage({
      'sui-note:sidebar-width': '320',
    });

    renderToStaticMarkup(<App apiClient={createDesktopApiClientStub()} />);

    expect(storage.get('frag-note:sidebar-width')).toBe('320');
    expect(storage.has('sui-note:sidebar-width')).toBe(false);
  });

  it('does not overwrite an existing frag-note sidebar width', () => {
    const storage = installMemoryLocalStorage({
      'frag-note:sidebar-width': '300',
      'sui-note:sidebar-width': '220',
    });

    renderToStaticMarkup(<App apiClient={createDesktopApiClientStub()} />);

    expect(storage.get('frag-note:sidebar-width')).toBe('300');
    expect(storage.has('sui-note:sidebar-width')).toBe(true);
  });
});

function installMemoryLocalStorage(seed: Record<string, string>) {
  const storage = new Map(Object.entries(seed));

  globalThis.localStorage = {
    getItem(key: string) {
      return storage.has(key) ? storage.get(key)! : null;
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
    removeItem(key: string) {
      storage.delete(key);
    },
    clear() {
      storage.clear();
    },
    key(index: number) {
      return Array.from(storage.keys())[index] ?? null;
    },
    get length() {
      return storage.size;
    },
  } as Storage;

  return storage;
}
