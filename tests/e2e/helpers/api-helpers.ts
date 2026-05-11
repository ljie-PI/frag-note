import { TEST_ENV } from '../setup/test-env.ts';

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }
}

export function createApiClient(accessToken: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: TEST_ENV.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken}`,
  };

  return {
    async captureFragment(payload: {
      fragmentId: string;
      sourceType: string;
      rawTextOptional?: string;
      titleOptional?: string;
      createdAt: string;
    }) {
      const res = await fetch(
        `${TEST_ENV.SUPABASE_URL}/functions/v1/capture-fragment`,
        { method: 'POST', headers, body: JSON.stringify(payload) },
      );
      return { status: res.status, data: await safeJson(res) as Record<string, unknown> };
    },

    async createDeviceSession() {
      const res = await fetch(
        `${TEST_ENV.SUPABASE_URL}/functions/v1/device-session`,
        { method: 'POST', headers, body: JSON.stringify({}) },
      );
      return { status: res.status, data: await safeJson(res) as Record<string, unknown> };
    },

    async reviewDerivedObject(objectId: string, action: 'confirm' | 'dismiss' | 'postpone') {
      const res = await fetch(
        `${TEST_ENV.SUPABASE_URL}/functions/v1/review-derived-object`,
        { method: 'POST', headers, body: JSON.stringify({ objectId, action }) },
      );
      return { status: res.status, data: await safeJson(res) as Record<string, unknown> };
    },

    async getFragment(fragmentId: string) {
      const res = await fetch(
        `${TEST_ENV.SUPABASE_URL}/rest/v1/fragments?fragment_id=eq.${fragmentId}&select=*`,
        { headers },
      );
      const data = await safeJson(res) as Record<string, unknown>[];
      return data[0] ?? null;
    },

    async getArtifacts(fragmentId: string) {
      const res = await fetch(
        `${TEST_ENV.SUPABASE_URL}/rest/v1/derived_artifacts?fragment_id=eq.${fragmentId}&select=*`,
        { headers },
      );
      return safeJson(res);
    },

    async getRelations(fragmentId: string) {
      const res = await fetch(
        `${TEST_ENV.SUPABASE_URL}/rest/v1/relations?or=(source_object_id.eq.${fragmentId},target_object_id.eq.${fragmentId})&select=*`,
        { headers },
      );
      return safeJson(res);
    },

    async getCandidates() {
      const res = await fetch(
        `${TEST_ENV.SUPABASE_URL}/rest/v1/derived_objects?status=in.(candidate,dismissed,postponed)&select=*&order=updated_at.desc`,
        { headers },
      );
      return safeJson(res);
    },

    async getDerivedObject(objectId: string) {
      const res = await fetch(
        `${TEST_ENV.SUPABASE_URL}/rest/v1/derived_objects?object_id=eq.${objectId}&select=*`,
        { headers },
      );
      const data = await safeJson(res) as Record<string, unknown>[];
      return data[0] ?? null;
    },

    async getProcessingJobs(fragmentId: string) {
      const res = await fetch(
        `${TEST_ENV.SUPABASE_URL}/rest/v1/processing_jobs?fragment_id=eq.${fragmentId}&select=*`,
        { headers },
      );
      return safeJson(res);
    },

    async listFragments() {
      const res = await fetch(
        `${TEST_ENV.SUPABASE_URL}/rest/v1/fragments?select=*&order=created_at.desc`,
        { headers },
      );
      return safeJson(res);
    },
  };
}

/** Service-role client for test data setup (bypasses RLS) */
export function createServiceClient() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: TEST_ENV.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${TEST_ENV.SUPABASE_SERVICE_ROLE_KEY}`,
  };

  return {
    async insertDerivedObject(row: Record<string, unknown>) {
      const res = await fetch(`${TEST_ENV.SUPABASE_URL}/rest/v1/derived_objects`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify(row),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`insertDerivedObject failed (${res.status}): ${text}`);
      }
      const data = await res.json();
      return Array.isArray(data) ? data[0] : data;
    },

    async insertUser(userId: string) {
      const res = await fetch(`${TEST_ENV.SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ user_id: userId, created_at: new Date().toISOString() }),
      });
      // Ignore conflict (user may already exist from device session)
      if (!res.ok && res.status !== 409) {
        const text = await res.text();
        throw new Error(`insertUser failed (${res.status}): ${text}`);
      }
    },
  };
}
