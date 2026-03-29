import { useEffect, useMemo, useState } from 'react';
import type { AnswerArtifact, DerivedObject } from '@sui-note/domain';
import { CapturePalette } from '../features/capture/CapturePalette.tsx';
import {
  createCaptureStore,
  type LocalFragmentRecord,
} from '../features/capture/capture-store.ts';
import { createSyncService } from '../features/sync/sync-service.ts';
import { createDesktopApiClient } from '../lib/api-client.ts';
import { createDesktopAdapter } from '../lib/desktop-adapter.ts';
import { RecentFragmentsPage } from './routes/recent-fragments.tsx';
import { FragmentDetailPage } from './routes/fragment-detail.tsx';
import { OrganizationPage } from './routes/organization.tsx';
import { DerivedObjectDetailPage } from './routes/derived-object-detail.tsx';
import { SearchPage } from './routes/search.tsx';

export function App() {
  const adapter = useMemo(() => createDesktopAdapter(), []);
  const store = useMemo(() => createCaptureStore({ adapter }), [adapter]);
  const apiClient = useMemo(() => createDesktopApiClient(), []);
  const syncService = useMemo(
    () => createSyncService({ store, apiClient }),
    [apiClient, store],
  );

  const [records, setRecords] = useState<LocalFragmentRecord[]>([]);
  const [candidates, setCandidates] = useState<DerivedObject[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<LocalFragmentRecord | null>(
    null,
  );
  const [selectedCandidate, setSelectedCandidate] = useState<DerivedObject | null>(
    null,
  );

  const refresh = async () => {
    const [nextRecords, nextCandidates] = await Promise.all([
      store.listRecords(),
      apiClient.listCandidates().catch(() => []),
    ]);

    setRecords(nextRecords);
    setCandidates(nextCandidates);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleAnswerSave = async (answer: AnswerArtifact) => {
    await apiClient.saveAnswerAsFragment(answer.answerId, {
      sourceQuery: answer.queryText,
      citedFragmentIds: answer.citations.map((citation) => citation.fragmentId),
    });
    await refresh();
  };

  const handleCandidateAction = async (
    candidate: DerivedObject,
    action: 'confirm' | 'dismiss' | 'postpone',
  ) => {
    try {
      await apiClient.reviewCandidate(candidate.objectId, action);
    } finally {
      await refresh();
    }
  };

  return (
    <main>
      <h1>Sui Note Desktop</h1>
      <CapturePalette store={store} syncService={syncService} onSaved={refresh} />
      <RecentFragmentsPage
        records={records}
        onSelect={setSelectedRecord}
        onRetry={async () => {
          await syncService.flushQueue();
          await refresh();
        }}
      />
      <FragmentDetailPage record={selectedRecord} />
      <OrganizationPage
        candidates={candidates}
        onSelect={setSelectedCandidate}
        onConfirm={(candidate) => handleCandidateAction(candidate, 'confirm')}
        onDismiss={(candidate) => handleCandidateAction(candidate, 'dismiss')}
        onPostpone={(candidate) => handleCandidateAction(candidate, 'postpone')}
      />
      <DerivedObjectDetailPage candidate={selectedCandidate} />
      <SearchPage onSearch={apiClient.search} onSaveAnswer={handleAnswerSave} />
    </main>
  );
}
