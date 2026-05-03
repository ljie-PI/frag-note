import { invoke } from '@tauri-apps/api/core';
import type { DesktopAdapter, LocalFragmentRecord } from '../features/capture/capture-store.ts';

const STORAGE_KEY = 'frag-note.desktop.fragments';
const LEGACY_STORAGE_KEYS = ['sui-note.desktop.fragments'] as const;

export function createDesktopAdapter(): DesktopAdapter {
  if (hasTauriRuntime()) {
    return createTauriDesktopAdapter();
  }

  return createBrowserDesktopAdapter();
}

function createTauriDesktopAdapter(): DesktopAdapter {
  return {
    async save(record) {
      await invoke('save_fragment_record', { payload: JSON.stringify(record) });
    },
    async list() {
      const records = await invoke<string[]>('list_fragment_records');
      return records.map((record) => JSON.parse(record) as LocalFragmentRecord);
    },
    async get(fragmentId) {
      const record = await invoke<string | null>('get_fragment_record', {
        fragmentId,
      });
      return record ? (JSON.parse(record) as LocalFragmentRecord) : null;
    },
  };
}

function createBrowserDesktopAdapter(): DesktopAdapter {
  migrateLegacyBrowserStorage();

  const readAll = () => {
    if (typeof localStorage === 'undefined') {
      return [] as LocalFragmentRecord[];
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as LocalFragmentRecord[]) : [];
  };

  const writeAll = (records: LocalFragmentRecord[]) => {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  };

  return {
    async save(record) {
      const records = readAll();
      const nextRecords = [
        ...records.filter(
          (existing) => existing.fragment.fragmentId !== record.fragment.fragmentId,
        ),
        record,
      ];
      writeAll(nextRecords);
    },
    async list() {
      return readAll().sort((left, right) =>
        right.fragment.createdAt.localeCompare(left.fragment.createdAt),
      );
    },
    async get(fragmentId) {
      return (
        readAll().find((record) => record.fragment.fragmentId === fragmentId) ??
        null
      );
    },
  };
}

function hasTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// Backwards-compat: copy any data stored under pre-rename localStorage keys
// (e.g. `sui-note.desktop.fragments`) into the current key so the rename is
// transparent to existing browser-mode users. Idempotent: legacy key is
// removed after the copy, so subsequent calls are no-ops.
function migrateLegacyBrowserStorage(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  for (const legacyKey of LEGACY_STORAGE_KEYS) {
    const legacyValue = localStorage.getItem(legacyKey);
    if (legacyValue === null) {
      continue;
    }

    if (localStorage.getItem(STORAGE_KEY) === null) {
      localStorage.setItem(STORAGE_KEY, legacyValue);
    }
    localStorage.removeItem(legacyKey);
  }
}
