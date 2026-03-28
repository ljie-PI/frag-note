import type {
  Asset,
  DerivedArtifact,
  Fragment,
  ProcessingJob,
  Relation,
} from '@sui-note/domain';
import type { CaptureStore, LocalFragmentRecord } from '../capture/capture-store.ts';

export type DesktopApiClient = {
  ingestFragment(payload: {
    fragmentId: string;
    sourceType: Fragment['sourceType'];
    rawText: string | null;
    titleOptional: string | null;
  }): Promise<{ fragmentId: string; status: 'processing' | 'ready' }>;
  getFragmentDetail(fragmentId: string): Promise<{
    fragment: Fragment;
    assets: Asset[];
    derivedArtifacts: DerivedArtifact[];
    relatedFragments: Relation[];
    processingJobs: ProcessingJob[];
  }>;
};

export function createSyncService({
  store,
  apiClient,
}: {
  store: CaptureStore;
  apiClient: DesktopApiClient;
}) {
  return {
    async flushQueue() {
      const records = await store.listRecords();
      const queuedRecords = records.filter(
        (record) =>
          record.fragment.status === 'queued_upload' ||
          record.fragment.status === 'syncing',
      );

      for (const record of queuedRecords) {
        await store.updateRecord({
          ...record,
          fragment: {
            ...record.fragment,
            status: 'syncing',
          },
        });

        await apiClient.ingestFragment({
          fragmentId: record.fragment.fragmentId,
          sourceType: record.fragment.sourceType,
          rawText: record.fragment.rawTextOptional ?? null,
          titleOptional: record.fragment.titleOptional ?? null,
        });

        const detail = await apiClient.getFragmentDetail(record.fragment.fragmentId);
        await store.updateRecord(normalizeDetail(detail));
      }
    },
  };
}

function normalizeDetail(detail: {
  fragment: Fragment;
  assets: Asset[];
  derivedArtifacts: DerivedArtifact[];
  relatedFragments: Relation[];
  processingJobs: ProcessingJob[];
}): LocalFragmentRecord {
  return {
    fragment: detail.fragment,
    assets: detail.assets,
    derivedArtifacts: detail.derivedArtifacts,
    relatedFragments: detail.relatedFragments,
    processingJobs: detail.processingJobs,
  };
}
