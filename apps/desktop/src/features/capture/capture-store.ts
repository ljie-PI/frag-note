import type {
  Asset,
  DerivedArtifact,
  Fragment,
  ProcessingJob,
  Relation,
} from '@frag-note/domain';

export type LocalFragmentRecord = {
  fragment: Fragment;
  assets: Asset[];
  derivedArtifacts: DerivedArtifact[];
  relatedFragments: Relation[];
  processingJobs: ProcessingJob[];
};

export type SaveLocalFragmentInput = {
  sourceType: Fragment['sourceType'];
  rawText?: string | null;
  titleOptional?: string | null;
};

export type DesktopAdapter = {
  save(record: LocalFragmentRecord): Promise<void>;
  list(): Promise<LocalFragmentRecord[]>;
  get(fragmentId: string): Promise<LocalFragmentRecord | null>;
};

export type CaptureStore = ReturnType<typeof createCaptureStore>;

export function createCaptureStore({
  adapter,
}: {
  adapter: DesktopAdapter;
}) {
  return {
    async saveFragment(input: SaveLocalFragmentInput) {
      const record = buildLocalRecord(input);
      await adapter.save(record);
      return record.fragment;
    },
    async listFragments() {
      const records = await adapter.list();
      return records.map((record) => record.fragment);
    },
    async listRecords() {
      return adapter.list();
    },
    async getFragment(fragmentId: string) {
      return adapter.get(fragmentId);
    },
    async updateRecord(record: LocalFragmentRecord) {
      await adapter.save(record);
    },
  };
}

export function createInMemoryDesktopAdapter(): DesktopAdapter {
  const records = new Map<string, LocalFragmentRecord>();

  return {
    async save(record) {
      records.set(record.fragment.fragmentId, record);
    },
    async list() {
      return [...records.values()].sort((left, right) =>
        right.fragment.createdAt.localeCompare(left.fragment.createdAt),
      );
    },
    async get(fragmentId) {
      return records.get(fragmentId) ?? null;
    },
  };
}

function buildLocalRecord(input: SaveLocalFragmentInput): LocalFragmentRecord {
  const createdAt = new Date().toISOString();

  return {
    fragment: {
      fragmentId: createUuid(),
      userId: '99999999-9999-4999-8999-999999999999',
      createdAt,
      sourceType: input.sourceType,
      originKind: 'user_capture',
      titleOptional: input.titleOptional ?? null,
      rawTextOptional: input.rawText ?? null,
      status: 'queued_upload',
      deviceMetadata: {
        platform: 'desktop',
        captureMethod: 'palette_text',
        appVersion: '0.1.0',
        deviceName: 'desktop',
      },
      languageHintOptional: 'en',
    },
    assets: [],
    derivedArtifacts: [],
    relatedFragments: [],
    processingJobs: [],
  };
}

function createUuid() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
