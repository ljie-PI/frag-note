import { afterEach, describe, expect, it, mock } from 'bun:test';

const originalLocalStorage = globalThis.localStorage;
const originalFetch = globalThis.fetch;
const originalApiBase = process.env.VITE_API_BASE_URL;
const originalSupabaseUrl = process.env.VITE_SUPABASE_URL;
const originalSupabaseAnon = process.env.VITE_SUPABASE_ANON_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalLocalStorage) {
    globalThis.localStorage = originalLocalStorage;
  } else {
    Reflect.deleteProperty(globalThis, 'localStorage');
  }

  restoreEnv('VITE_API_BASE_URL', originalApiBase);
  restoreEnv('VITE_SUPABASE_URL', originalSupabaseUrl);
  restoreEnv('VITE_SUPABASE_ANON_KEY', originalSupabaseAnon);
});

describe('desktop api client routing', () => {
  it('uses API /v1/search when VITE_API_BASE_URL is configured', async () => {
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
    process.env.VITE_API_BASE_URL = 'http://localhost:3000';
    installMemoryLocalStorage({
      'sb-access-token': 'test-access-token',
      'sb-refresh-token': 'test-refresh-token',
      'sb-user-id': '11111111-1111-4111-8111-111111111111',
    });

    const calls: string[] = [];
    globalThis.fetch = mock(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(url);

      if (url.endsWith('/auth/v1/user')) {
        return createJsonResponse(
          { id: '11111111-1111-4111-8111-111111111111' },
          { ok: true, status: 200 },
        );
      }

      if (url === 'http://localhost:3000/v1/search') {
        expect((init?.headers as Record<string, string>).authorization).toBe(
          'Bearer test-access-token',
        );
        return createJsonResponse(
          {
            answerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            queryText: 'ocr',
            queryType: 'natural_language',
            answerBody: 'OCR note',
            answerFormat: 'summary',
            retrievalBundle: [],
            modelMetadata: { provider: 'heuristic', model: 'heuristic' },
            citations: [],
            provenance: {
              sourceQuery: 'ocr',
              citedFragmentIds: [],
            },
            savedAsFragment: false,
            createdAt: '2026-03-30T00:00:00.000Z',
          },
          { ok: true, status: 200 },
        );
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    }) as typeof fetch;

    const { createDesktopApiClient } = await loadApiClientModule();
    const client = createDesktopApiClient();
    await client.search({ queryText: 'ocr', queryType: 'natural_language' });

    expect(calls.some((url) => url.includes('/functions/v1/search-query'))).toBe(
      false,
    );
    expect(calls).toContain('http://localhost:3000/v1/search');
  });

  it('uses API answer promotion route when VITE_API_BASE_URL is configured', async () => {
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
    process.env.VITE_API_BASE_URL = 'http://localhost:3000';
    installMemoryLocalStorage({
      'sb-access-token': 'test-access-token',
      'sb-refresh-token': 'test-refresh-token',
      'sb-user-id': '11111111-1111-4111-8111-111111111111',
    });

    const calls: string[] = [];
    globalThis.fetch = mock(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(url);

      if (url.endsWith('/auth/v1/user')) {
        return createJsonResponse(
          { id: '11111111-1111-4111-8111-111111111111' },
          { ok: true, status: 200 },
        );
      }

      if (
        url ===
        'http://localhost:3000/v1/answers/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/save-as-fragment'
      ) {
        expect((init?.headers as Record<string, string>).authorization).toBe(
          'Bearer test-access-token',
        );
        return createJsonResponse(
          {
            fragmentId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            originKind: 'answer_promotion',
            sourceAnswerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          },
          { ok: true, status: 201 },
        );
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    }) as typeof fetch;

    const { createDesktopApiClient } = await loadApiClientModule();
    const client = createDesktopApiClient();
    await client.saveAnswerAsFragment(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      {
        sourceQuery: 'ocr',
        citedFragmentIds: [],
      },
    );

    expect(calls.some((url) => url.includes('/functions/v1/promote-answer'))).toBe(
      false,
    );
    expect(calls).toContain(
      'http://localhost:3000/v1/answers/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/save-as-fragment',
    );
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

function restoreEnv(name: string, original: string | undefined) {
  if (typeof original === 'string') {
    process.env[name] = original;
  } else {
    delete process.env[name];
  }
}

async function loadApiClientModule() {
  mock.module('@tauri-apps/api/core', () => ({
    invoke: async () => null,
  }));
  mock.module('@frag-note/contracts/auth', () => ({
    createDeviceSessionResponseSchema: {
      parse(value: unknown) {
        return value;
      },
    },
  }));
  return import('../../apps/desktop/src/lib/api-client.ts');
}
