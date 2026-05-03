import {
  createDeviceSessionResponseSchema,
  type CreateDeviceSessionResponse,
} from '@frag-note/contracts/auth';

const ACCESS_TOKEN_KEY = 'sb-access-token';
const REFRESH_TOKEN_KEY = 'sb-refresh-token';
const USER_ID_KEY = 'sb-user-id';

export interface AuthClientFetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export interface AuthClientFetch {
  (
    input: string,
    init: {
      method: string;
      headers: Record<string, string>;
      body?: string;
      signal?: unknown;
    },
  ): Promise<AuthClientFetchResponse>;
}

export interface CreateAuthClientOptions {
  baseUrl: string;
  fetchImpl: AuthClientFetch;
}

export type DesktopAuthSession = {
  accessToken: string;
  refreshToken: string | null;
  userId: string;
};

export function createAuthClient({
  baseUrl,
  fetchImpl,
}: CreateAuthClientOptions) {
  void baseUrl;
  void fetchImpl;

  const supabaseUrl = requiredEnv('VITE_SUPABASE_URL');
  const supabaseAnonKey = requiredEnv('VITE_SUPABASE_ANON_KEY');

  return createSupabaseAuthClient(supabaseUrl, supabaseAnonKey);
}

function createSupabaseAuthClient(url: string, anonKey: string) {
  return {
    getSession(): DesktopAuthSession | null {
      return readStoredSession();
    },
    async signInWithPassword(email: string, password: string) {
      const response = await fetch(
        `${url}/auth/v1/token?grant_type=password`,
        {
          method: 'POST',
          headers: {
            apikey: anonKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const session = parseAuthSession(await response.json());
      writeStoredSession(session);
      return session;
    },
    async signUp(email: string, password: string) {
      const response = await fetch(`${url}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const session = parseAuthSession(await response.json());
      writeStoredSession(session);
      return session;
    },
    async signOut() {
      const session = readStoredSession();

      if (session) {
        await fetch(`${url}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            apikey: anonKey,
            authorization: `Bearer ${session.accessToken}`,
            'content-type': 'application/json',
          },
        }).catch(() => undefined);
      }

      clearStoredSession();
    },
    async createDeviceSession(): Promise<CreateDeviceSessionResponse> {
      const session = await ensureSupabaseSession(url, anonKey);

      if (!session?.accessToken) {
        throw new Error('Supabase access token is required');
      }

      const response = await fetch(`${url}/functions/v1/device-session`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          authorization: `Bearer ${session.accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to create device session via Supabase function');
      }

      return createDeviceSessionResponseSchema.parse(await response.json());
    },
  };
}

export async function ensureSupabaseSession(
  url: string,
  anonKey: string,
): Promise<DesktopAuthSession | null> {
  const storedSession = readStoredSession();

  if (!storedSession) {
    return null;
  }

  if (await validateSupabaseSession(url, anonKey, storedSession.accessToken)) {
    return storedSession;
  }

  if (!storedSession.refreshToken) {
    clearStoredSession();
    return null;
  }

  const refreshedSession = await refreshSupabaseSession(
    url,
    anonKey,
    storedSession.refreshToken,
  );

  if (!refreshedSession) {
    clearStoredSession();
    return null;
  }

  writeStoredSession(refreshedSession);
  return refreshedSession;
}

export function getStoredSupabaseSession(): DesktopAuthSession | null {
  return readStoredSession();
}

function parseAuthSession(payload: unknown): DesktopAuthSession {
  const value = payload as {
    access_token?: unknown;
    refresh_token?: unknown;
    user?: {
      id?: unknown;
    };
  };

  if (
    typeof value.access_token !== 'string' ||
    typeof value.user?.id !== 'string'
  ) {
    throw new Error('Supabase auth response did not include a usable session');
  }

  return {
    accessToken: value.access_token,
    refreshToken:
      typeof value.refresh_token === 'string' ? value.refresh_token : null,
    userId: value.user.id,
  };
}

async function validateSupabaseSession(
  url: string,
  anonKey: string,
  accessToken: string,
) {
  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${accessToken}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function refreshSupabaseSession(
  url: string,
  anonKey: string,
  refreshToken: string,
): Promise<DesktopAuthSession | null> {
  try {
    const response = await fetch(
      `${url}/auth/v1/token?grant_type=refresh_token`,
      {
        method: 'POST',
        headers: {
          apikey: anonKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      },
    );

    if (!response.ok) {
      return null;
    }

    return parseAuthSession(await response.json());
  } catch {
    return null;
  }
}

function writeStoredSession(session: DesktopAuthSession) {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  if (session.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
  localStorage.setItem(USER_ID_KEY, session.userId);
}

function readStoredSession(): DesktopAuthSession | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const userId = localStorage.getItem(USER_ID_KEY);

  if (!accessToken || !userId) {
    return null;
  }

  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

  return {
    accessToken,
    refreshToken,
    userId,
  };
}

function clearStoredSession() {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
}

function readEnv(name: string): string | null {
  const value = import.meta.env?.[name];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function requiredEnv(name: string): string {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`${name} is required for Supabase auth`);
  }

  return value;
}
