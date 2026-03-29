import { afterEach, describe, expect, it, mock } from 'bun:test';
import {
  ensureSupabaseSession,
  getStoredSupabaseSession,
} from '../../apps/desktop/src/lib/auth-client.ts';

const originalLocalStorage = globalThis.localStorage;
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalLocalStorage) {
    globalThis.localStorage = originalLocalStorage;
  } else {
    Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

describe('desktop auth client session refresh', () => {
  it('refreshes an expired access token and persists the new session', async () => {
    installMemoryLocalStorage({
      'sb-access-token': 'expired-token',
      'sb-refresh-token': 'refresh-token',
      'sb-user-id': '11111111-1111-4111-8111-111111111111',
    });

    globalThis.fetch = mock(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/auth/v1/user')) {
        const authorization = init?.headers
          ? String((init.headers as Record<string, string>).authorization ?? '')
          : '';

        if (authorization === 'Bearer expired-token') {
          return createJsonResponse(
            { error: 'expired' },
            {
              ok: false,
              status: 401,
            },
          );
        }

        return createJsonResponse(
          {
            id: '11111111-1111-4111-8111-111111111111',
          },
          { ok: true, status: 200 },
        );
      }

      if (url.endsWith('/auth/v1/token?grant_type=refresh_token')) {
        return createJsonResponse(
          {
            access_token: 'fresh-token',
            refresh_token: 'fresh-refresh-token',
            user: {
              id: '11111111-1111-4111-8111-111111111111',
            },
          },
          { ok: true, status: 200 },
        );
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    }) as typeof fetch;

    const session = await ensureSupabaseSession(
      'https://example.supabase.co',
      'anon-key',
    );

    expect(session).toEqual({
      accessToken: 'fresh-token',
      refreshToken: 'fresh-refresh-token',
      userId: '11111111-1111-4111-8111-111111111111',
    });
    expect(getStoredSupabaseSession()).toEqual(session);
  });
});

function installMemoryLocalStorage(seed: Record<string, string>) {
  const storage = new Map(Object.entries(seed));

  globalThis.localStorage = {
    getItem(key: string) {
      return storage.has(key) ? storage.get(key)! : null;
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
    removeItem(key: string) {
      storage.delete(key);
    },
    clear() {
      storage.clear();
    },
    key(index: number) {
      return Array.from(storage.keys())[index] ?? null;
    },
    get length() {
      return storage.size;
    },
  } as Storage;
}

function createJsonResponse(
  payload: unknown,
  options: {
    ok: boolean;
    status: number;
  },
) {
  return {
    ok: options.ok,
    status: options.status,
    async json() {
      return payload;
    },
    async text() {
      return JSON.stringify(payload);
    },
  } as Response;
}
