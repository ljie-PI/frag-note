import { afterEach, describe, expect, it, mock } from 'bun:test';

const originalLocalStorage = globalThis.localStorage;

afterEach(() => {
  if (originalLocalStorage) {
    globalThis.localStorage = originalLocalStorage;
  } else {
    Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

describe('createDesktopAdapter (browser fallback) legacy key migration', () => {
  it('moves pre-rename sui-note fragments into the frag-note key on first read', async () => {
    const seed = JSON.stringify([
      {
        fragment: {
          fragmentId: '11111111-1111-4111-8111-111111111111',
          createdAt: '2026-04-01T00:00:00.000Z',
        },
      },
    ]);
    const storage = installMemoryLocalStorage({
      'sui-note.desktop.fragments': seed,
    });

    const { createDesktopAdapter } = await loadAdapterModule();
    createDesktopAdapter();

    expect(storage.get('frag-note.desktop.fragments')).toBe(seed);
    expect(storage.has('sui-note.desktop.fragments')).toBe(false);
  });

  it('does not clobber existing frag-note data when both keys are present', async () => {
    const newer = JSON.stringify([{ fragment: { fragmentId: 'new', createdAt: 'b' } }]);
    const legacy = JSON.stringify([{ fragment: { fragmentId: 'old', createdAt: 'a' } }]);
    const storage = installMemoryLocalStorage({
      'frag-note.desktop.fragments': newer,
      'sui-note.desktop.fragments': legacy,
    });

    const { createDesktopAdapter } = await loadAdapterModule();
    createDesktopAdapter();

    expect(storage.get('frag-note.desktop.fragments')).toBe(newer);
    expect(storage.has('sui-note.desktop.fragments')).toBe(false);
  });

  it('is a no-op when no legacy key exists', async () => {
    const storage = installMemoryLocalStorage({
      'frag-note.desktop.fragments': '[]',
    });

    const { createDesktopAdapter } = await loadAdapterModule();
    createDesktopAdapter();

    expect(storage.get('frag-note.desktop.fragments')).toBe('[]');
    expect(storage.has('sui-note.desktop.fragments')).toBe(false);
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

async function loadAdapterModule() {
  mock.module('@tauri-apps/api/core', () => ({
    invoke: async () => null,
  }));
  return import('../../apps/desktop/src/lib/desktop-adapter.ts');
}
