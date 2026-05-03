import { invoke } from '@tauri-apps/api/core';
import type { DesktopAdapter, LocalFragmentRecord } from '../features/capture/capture-store.ts';

const STORAGE_KEY = 'frag-note.desktop.fragments';

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
