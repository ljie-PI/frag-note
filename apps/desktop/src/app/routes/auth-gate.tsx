import { useState } from 'react';
import type { createAuthClient } from '../../lib/auth-client.ts';
import { useTranslation } from '../../i18n/LocaleContext.tsx';

type DesktopAuthClient = ReturnType<typeof createAuthClient>;

export function AuthGate({
  authClient,
  onAuthenticated,
}: {
  authClient: DesktopAuthClient;
  onAuthenticated: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (mode: 'sign_in' | 'sign_up') => {
    setBusy(true);
    setError(null);

    try {
      if (mode === 'sign_in') {
        await authClient.signInWithPassword(email, password);
      } else {
        await authClient.signUp(email, password);
      }

      await authClient.createDeviceSession();
      await onAuthenticated();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-semibold text-slate-900 mb-6">{t('auth.title')}</h2>
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">{t('auth.email')}</span>
          <input
            aria-label={t('auth.email')}
            autoComplete="username"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            value={email}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">{t('auth.password')}</span>
          <input
            aria-label={t('auth.password')}
            autoComplete="current-password"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            type="password"
            value={password}
          />
        </label>
        {error ? <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2" role="alert">{error}</p> : null}
        <div className="flex gap-3 pt-2">
          <button
            className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={busy || email.length === 0 || password.length === 0}
            onClick={() => void handleAuth('sign_in')}
            type="button"
          >
            {t('auth.signIn')}
          </button>
          <button
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={busy || email.length === 0 || password.length === 0}
            onClick={() => void handleAuth('sign_up')}
            type="button"
          >
            {t('auth.signUp')}
          </button>
        </div>
      </div>
    </section>
  );
}
