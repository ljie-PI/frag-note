import { describe, expect, it } from 'bun:test';

describe('parseEnv', () => {
  it('requires Supabase configuration and fills storage defaults', async () => {
    const { hasSupabaseRuntimeEnv, parseEnv } = await import(
      '../../../apps/api/src/lib/env.js'
    );

    expect(
      parseEnv({
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_ANON_KEY: 'anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      }),
    ).toEqual({
      supabase: {
        url: 'https://example.supabase.co',
        anonKey: 'anon-key',
        serviceRoleKey: 'service-role-key',
        storage: {
          rawBucket: 'captures-raw',
          derivedBucket: 'captures-derived',
        },
      },
      ai: {
        openAiApiKey: null,
      },
    });
    expect(
      hasSupabaseRuntimeEnv({
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_ANON_KEY: 'anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      }),
    ).toBe(true);

    expect(() =>
      parseEnv({
        SUPABASE_ANON_KEY: 'anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      }),
    ).toThrow(/SUPABASE_URL/i);

    expect(() =>
      parseEnv({
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      }),
    ).toThrow(/SUPABASE_ANON_KEY/i);
  });
});
