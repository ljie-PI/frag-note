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
