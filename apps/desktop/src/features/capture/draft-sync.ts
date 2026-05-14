import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { LocalAssetPointer } from '../storage/local-assets.ts';

export type DraftPayload = {
  sourceLabel: string;
  rawText: string;
  assets: LocalAssetPointer[];
};

export type SavedPayload = {
  sourceLabel: string;
};

const DRAFT_EVENT = 'capture-draft:update';
const SAVED_EVENT = 'capture-draft:saved';

export function getCurrentLabel(): string {
  if (!hasTauriRuntime()) return 'unknown';

  try {
    return getCurrentWindow().label;
  } catch {
    return 'unknown';
  }
}

export async function publishDraft(payload: Omit<DraftPayload, 'sourceLabel'>) {
  if (!hasTauriRuntime()) return;

  await emit(DRAFT_EVENT, { ...payload, sourceLabel: getCurrentLabel() });
}

export async function publishSaved() {
  if (!hasTauriRuntime()) return;

  await emit(SAVED_EVENT, { sourceLabel: getCurrentLabel() } satisfies SavedPayload);
}

export function subscribeDraft(handler: (payload: DraftPayload) => void): Promise<UnlistenFn> {
  if (!hasTauriRuntime()) return Promise.resolve(() => undefined);

  const selfLabel = getCurrentLabel();
  return listen<DraftPayload>(DRAFT_EVENT, (event) => {
    if (!isDraftPayload(event.payload) || event.payload.sourceLabel === selfLabel) return;
    handler(event.payload);
  });
}

export function subscribeSaved(handler: (payload: SavedPayload) => void): Promise<UnlistenFn> {
  if (!hasTauriRuntime()) return Promise.resolve(() => undefined);

  const selfLabel = getCurrentLabel();
  return listen<SavedPayload>(SAVED_EVENT, (event) => {
    if (!isSavedPayload(event.payload) || event.payload.sourceLabel === selfLabel) return;
    handler(event.payload);
  });
}

type DebouncedFunction<Args extends unknown[]> = ((...args: Args) => void) & {
  cancel: () => void;
};

export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number,
): DebouncedFunction<Args> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounced = ((...args: Args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, delayMs);
  }) as DebouncedFunction<Args>;

  debounced.cancel = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = undefined;
  };

  return debounced;
}

function isDraftPayload(payload: unknown): payload is DraftPayload {
  return isObject(payload)
    && typeof payload.sourceLabel === 'string'
    && typeof payload.rawText === 'string'
    && Array.isArray(payload.assets)
    && payload.assets.every(isLocalAssetPointer);
}

function isLocalAssetPointer(asset: unknown): asset is LocalAssetPointer {
  return isObject(asset)
    && typeof asset.fileName === 'string'
    && typeof asset.mimeType === 'string'
    && (asset.localPath === undefined || typeof asset.localPath === 'string')
    && (asset.byteSize === undefined || typeof asset.byteSize === 'number')
    && (asset.base64Data === undefined || typeof asset.base64Data === 'string');
}

function isSavedPayload(payload: unknown): payload is SavedPayload {
  return isObject(payload) && typeof payload.sourceLabel === 'string';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
