import { useEffect, useMemo, useState } from 'react';
import type { AnswerArtifact, DerivedObject } from '@sui-note/domain';
import { PenLine, FileText, FolderKanban, Search, NotebookPen, LogOut } from 'lucide-react';
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

type AppView = 'capture' | 'fragments' | 'organization' | 'search';

const NAV_ICONS: Record<AppView, React.ReactNode> = {
  capture: <PenLine size={18} />,
  fragments: <FileText size={18} />,
  organization: <FolderKanban size={18} />,
  search: <Search size={18} />,
};

const NAV_ITEMS: { key: AppView; label: string }[] = [
  { key: 'capture', label: '随记' },
  { key: 'fragments', label: '碎片' },
  { key: 'organization', label: '整理' },
  { key: 'search', label: '搜索' },
];

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

  const [activeView, setActiveView] = useState<AppView>('capture');
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
      return (
        <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-slate-50 flex items-center justify-center">
          <h1 className="text-2xl font-bold text-slate-400">碎记</h1>
        </main>
      );
    }

    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-slate-50 flex items-center justify-center">
        <div className="w-full max-w-sm p-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-600 text-white mb-4"><NotebookPen size={28} /></div>
            <h1 className="text-2xl font-bold text-slate-900">碎记</h1>
            <p className="text-sm text-slate-500 mt-1">AI 驱动的碎片笔记</p>
          </div>
          <AuthGate
            authClient={authClient}
            onAuthenticated={async () => {
              setIsAuthenticated(true);
            }}
          />
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-700/50">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-purple-500 text-white"><NotebookPen size={16} /></span>
            碎记
          </h1>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeView === item.key
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
              onClick={() => setActiveView(item.key)}
              type="button"
            >
              {NAV_ICONS[item.key]}
              {item.label}
              {item.key === 'fragments' && records.length > 0 ? (
                <span className="ml-auto text-xs bg-slate-700 text-slate-300 rounded-full px-2 py-0.5">{records.length}</span>
              ) : null}
              {item.key === 'organization' && candidates.length > 0 ? (
                <span className="ml-auto text-xs bg-purple-500/30 text-purple-300 rounded-full px-2 py-0.5">{candidates.length}</span>
              ) : null}
            </button>
          ))}
        </nav>
        {authClient ? (
          <div className="px-3 py-4 border-t border-slate-700/50">
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors"
              onClick={async () => {
                await authClient.signOut();
                setIsAuthenticated(false);
                setSelectedRecord(null);
                setSelectedCandidate(null);
              }}
              type="button"
            >
              <LogOut size={18} />
              退出登录
            </button>
          </div>
        ) : null}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto relative">
        <div className={`absolute inset-0 ${activeView === 'capture' ? 'capture-bg' : 'bg-slate-50'}`} />

        <div className="relative h-full">
          {activeView === 'capture' ? (
            <div className="h-full flex items-center justify-center px-8">
              <div className="w-full max-w-2xl">
                <CapturePalette store={store} syncService={syncService} onSaved={refresh} />
              </div>
            </div>
          ) : null}

          {activeView === 'fragments' ? (
            <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
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
            </div>
          ) : null}

          {activeView === 'organization' ? (
            <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
              <OrganizationPage
                candidates={candidates}
                onSelect={setSelectedCandidate}
                onConfirm={(candidate) => handleCandidateAction(candidate, 'confirm')}
                onDismiss={(candidate) => handleCandidateAction(candidate, 'dismiss')}
                onPostpone={(candidate) => handleCandidateAction(candidate, 'postpone')}
              />
              <DerivedObjectDetailPage candidate={selectedCandidate} />
            </div>
          ) : null}

          {activeView === 'search' ? (
            <div className="max-w-4xl mx-auto px-8 py-8">
              <SearchPage onSearch={apiClient.search} onSaveAnswer={handleAnswerSave} />
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
