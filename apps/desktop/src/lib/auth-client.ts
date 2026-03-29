import {
  createDeviceSessionResponseSchema,
  type CreateDeviceSessionResponse,
} from '@sui-note/contracts/auth';

export interface AuthClientFetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export interface AuthClientFetch {
  (
    input: string,
    init: {
      method: string;
      headers: Record<string, string>;
      body: string;
      signal?: unknown;
    },
  ): Promise<AuthClientFetchResponse>;
}

export interface CreateAuthClientOptions {
  baseUrl: string;
  fetchImpl: AuthClientFetch;
}

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
    async createDeviceSession(): Promise<CreateDeviceSessionResponse> {
      const session = await readSupabaseSession(url, anonKey);

      return createDeviceSessionResponseSchema.parse({
        userId:
          session?.user.id ?? '99999999-9999-4999-8999-999999999999',
        deviceSessionId: tokenToPseudoUuid(session?.access_token),
        createdAt: new Date().toISOString(),
      });
    },
  };
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

function tokenToPseudoUuid(token: string | undefined) {
  const hex = (token ?? '').replace(/[^a-f0-9]/gi, '').padEnd(32, '0').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

async function readSupabaseSession(url: string, anonKey: string) {
  const accessToken =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('sb-access-token')
      : null;

  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const user = (await response.json()) as { id?: string };

    return {
      access_token: accessToken,
      user: {
        id: user.id ?? '99999999-9999-4999-8999-999999999999',
      },
    };
  } catch {
    return null;
  }
}
