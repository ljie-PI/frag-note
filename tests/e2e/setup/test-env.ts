export const TEST_ENV = {
  SUPABASE_URL: process.env.TEST_SUPABASE_URL ?? 'http://127.0.0.1:54321',
  SUPABASE_ANON_KEY:
    process.env.TEST_SUPABASE_ANON_KEY ??
    'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ??
    'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz',
  API_BASE_URL: process.env.TEST_API_BASE_URL ?? 'http://127.0.0.1:3000',
};
