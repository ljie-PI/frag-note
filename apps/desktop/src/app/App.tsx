import { useEffect, useMemo, useState } from 'react';
import type { AnswerArtifact, DerivedObject } from '@sui-note/domain';
import { CapturePalette } from '../features/capture/CapturePalette.tsx';
import {
  createCaptureStore,
  type LocalFragmentRecord,
} from '../features/capture/capture-store.ts';
import { createSyncService } from '../features/sync/sync-service.ts';
import {
  createDesktopApiClient,
  type ExtendedDesktopApiClient,
} from '../lib/api-client.ts';
import { createAuthClient } from '../lib/auth-client.ts';
import { createDesktopAdapter } from '../lib/desktop-adapter.ts';
import { RecentFragmentsPage } from './routes/recent-fragments.tsx';
import { FragmentDetailPage } from './routes/fragment-detail.tsx';
import { OrganizationPage } from './routes/organization.tsx';
import { DerivedObjectDetailPage } from './routes/derived-object-detail.tsx';
import { SearchPage } from './routes/search.tsx';
import { AuthGate } from './routes/auth-gate.tsx';

type AppProps = {
  apiClient?: ExtendedDesktopApiClient;
};

export function App({ apiClient: providedApiClient }: AppProps = {}) {
  const adapter = useMemo(() => createDesktopAdapter(), []);
  const store = useMemo(() => createCaptureStore({ adapter }), [adapter]);
  const authClient = useMemo(
    () =>
      providedApiClient
        ? null
        : createAuthClient({
            baseUrl: '',
            fetchImpl: fetch as never,
          }),
    [providedApiClient],
  );
  const [isAuthenticated, setIsAuthenticated] = useState(
    providedApiClient ? true : Boolean(authClient?.getSession()),
  );
  const apiClient = useMemo(
    () =>
      providedApiClient
        ? providedApiClient
        : isAuthenticated
          ? createDesktopApiClient()
          : null,
    [providedApiClient, isAuthenticated],
  );
  const syncService = useMemo(
    () => (apiClient ? createSyncService({ store, apiClient }) : null),
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
    if (!apiClient) {
      setRecords([]);
      setCandidates([]);
      return;
    }

    const [nextRecords, nextCandidates] = await Promise.all([
      store.listRecords(),
      apiClient.listCandidates().catch(() => []),
    ]);

    setRecords(nextRecords);
    setCandidates(nextCandidates);
  };

  useEffect(() => {
    void refresh();
  }, [apiClient]);

  const handleAnswerSave = async (answer: AnswerArtifact) => {
    if (!apiClient) {
      return;
    }

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

  if (!apiClient || !syncService) {
    if (!authClient) {
      return <main><h1>Sui Note Desktop</h1></main>;
    }

    return (
      <main>
        <h1>Sui Note Desktop</h1>
        <AuthGate
          authClient={authClient}
          onAuthenticated={async () => {
            setIsAuthenticated(true);
          }}
        />
      </main>
    );
  }

  return (
    <main>
      <h1>Sui Note Desktop</h1>
      {authClient ? (
        <button
          onClick={async () => {
            await authClient.signOut();
            setIsAuthenticated(false);
            setSelectedRecord(null);
            setSelectedCandidate(null);
          }}
          type="button"
        >
          Sign Out
        </button>
      ) : null}
      <CapturePalette store={store} syncService={syncService} onSaved={refresh} />
      <RecentFragmentsPage
        records={records}
        onSelect={setSelectedRecord}
        onRetry={async (record) => {
          if (record.fragment.status === 'failed') {
            await syncService.retryFailedFragment(record.fragment.fragmentId);
          } else {
            await syncService.flushQueue();
          }
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
