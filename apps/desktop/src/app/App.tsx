import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnswerArtifact, DerivedObject } from '@frag-note/domain';
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
import { ShortcutNoticeToaster } from '../components/notice-toast.tsx';
import { TitleBar } from './TitleBar.tsx';
import { useTranslation } from '../i18n/LocaleContext.tsx';
import { subscribeSaved } from '../features/capture/draft-sync.ts';

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

const NAV_KEYS: AppView[] = ['capture', 'fragments', 'organization', 'search'];

export function App({ apiClient: providedApiClient }: AppProps = {}) {
  const { t } = useTranslation();
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

  // Resizable sidebar
  const SIDEBAR_KEY = 'frag-note:sidebar-width';
  const LEGACY_SIDEBAR_KEYS = ['sui-note:sidebar-width'];
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      let saved = localStorage.getItem(SIDEBAR_KEY);
      // Always clean up legacy keys; only adopt their value when the new
      // key is missing, never overwrite an existing new value.
      for (const legacyKey of LEGACY_SIDEBAR_KEYS) {
        const legacyValue = localStorage.getItem(legacyKey);
        if (legacyValue === null) {
          continue;
        }
        if (saved === null) {
          localStorage.setItem(SIDEBAR_KEY, legacyValue);
          saved = legacyValue;
        }
        localStorage.removeItem(legacyKey);
      }
      return saved ? Math.max(200, Math.min(400, Number(saved))) : 260;
    } catch {
      return 260;
    }
  });
  const isDragging = useRef(false);
  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = Math.max(200, Math.min(400, e.clientX));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setSidebarWidth((w) => {
        try { localStorage.setItem(SIDEBAR_KEY, String(w)); } catch { /* SSR */ }
        return w;
      });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

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

  useEffect(() => {
    const unlisten = subscribeSaved(() => {
      void refresh();
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
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
        <div className="h-screen rounded-xl overflow-hidden bg-gradient-to-br from-purple-50 via-white to-slate-50 flex flex-col">
          <TitleBar />
          <main className="flex-1 flex items-center justify-center">
            <h1 className="text-2xl font-bold text-slate-400">{t('app.name')}</h1>
          </main>
          <ShortcutNoticeToaster />
        </div>
      );
    }

    return (
      <div className="h-screen rounded-xl overflow-hidden bg-gradient-to-br from-purple-50 via-white to-slate-50 flex flex-col">
        <TitleBar />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm p-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-600 text-white mb-4"><NotebookPen size={28} /></div>
              <h1 className="text-2xl font-bold text-slate-900">{t('app.name')}</h1>
              <p className="text-sm text-slate-500 mt-1">{t('app.tagline')}</p>
            </div>
            <AuthGate
              authClient={authClient}
              onAuthenticated={async () => {
                setIsAuthenticated(true);
              }}
            />
          </div>
        </main>
        <ShortcutNoticeToaster />
      </div>
    );
  }

  return (
    <div className="h-screen rounded-xl overflow-hidden bg-slate-50 flex flex-col">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="bg-stone-100 border-r border-stone-200/80 flex flex-col shrink-0" style={{ width: sidebarWidth }}>
        <div className="px-5 py-5 border-b border-stone-200/60">
          <h1 className="text-lg font-bold text-stone-800 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-purple-600 text-white"><NotebookPen size={16} /></span>
            {t('app.name')}
          </h1>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_KEYS.map((key) => (
            <button
              key={key}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeView === key
                  ? 'bg-purple-100/70 text-purple-800'
                  : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-800'
              }`}
              onClick={() => setActiveView(key)}
              type="button"
            >
              {NAV_ICONS[key]}
              {t(`nav.${key}`)}
              {key === 'fragments' && records.length > 0 ? (
                <span className="ml-auto text-xs bg-stone-300/60 text-stone-600 rounded-full px-2 py-0.5">{records.length}</span>
              ) : null}
              {key === 'organization' && candidates.length > 0 ? (
                <span className="ml-auto text-xs bg-purple-200/60 text-purple-700 rounded-full px-2 py-0.5">{candidates.length}</span>
              ) : null}
            </button>
          ))}
        </nav>
        {authClient ? (
          <div className="px-3 py-4 border-t border-stone-200/60">
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-stone-500 hover:bg-stone-200/60 hover:text-stone-700 transition-colors"
              onClick={async () => {
                await authClient.signOut();
                setIsAuthenticated(false);
                setSelectedRecord(null);
                setSelectedCandidate(null);
              }}
              type="button"
            >
              <LogOut size={18} />
              {t('auth.signOut')}
            </button>
          </div>
        ) : null}
      </aside>

      {/* Resize handle */}
      <div
        className="w-1 cursor-col-resize hover:bg-purple-300/50 active:bg-purple-400/50 transition-colors shrink-0"
        onMouseDown={handleMouseDown}
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute inset-0 capture-bg" />

        <div className="relative h-full">
          {activeView === 'capture' ? (
            <div className="h-full flex items-center justify-center px-8">
              <div className="w-full" style={{ maxWidth: 'clamp(672px, 55vw, 1008px)' }}>
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
      <ShortcutNoticeToaster />
    </div>
  );
}
