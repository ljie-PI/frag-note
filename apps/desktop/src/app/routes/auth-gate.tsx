import { useState } from 'react';
import type { createAuthClient } from '../../lib/auth-client.ts';

type DesktopAuthClient = ReturnType<typeof createAuthClient>;

export function AuthGate({
  authClient,
  onAuthenticated,
}: {
  authClient: DesktopAuthClient;
  onAuthenticated: () => Promise<void>;
}) {
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
    <section>
      <h2>Sign In</h2>
      <label>
        Email
        <input
          aria-label="Email"
          autoComplete="username"
          onChange={(event) => setEmail(event.target.value)}
          value={email}
        />
      </label>
      <label>
        Password
        <input
          aria-label="Password"
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <div>
        <button
          disabled={busy || email.length === 0 || password.length === 0}
          onClick={() => void handleAuth('sign_in')}
          type="button"
        >
          Sign In
        </button>
        <button
          disabled={busy || email.length === 0 || password.length === 0}
          onClick={() => void handleAuth('sign_up')}
          type="button"
        >
          Create Account
        </button>
      </div>
    </section>
  );
}
