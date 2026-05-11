import { TEST_ENV } from '../setup/test-env.ts';

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
      return { status: res.status, data: await res.json() };
    },

    async createDeviceSession() {
      const res = await fetch(
        `${TEST_ENV.SUPABASE_URL}/functions/v1/device-session`,
        { method: 'POST', headers, body: JSON.stringify({}) },
      );
      return { status: res.status, data: await res.json() };
    },

    async getFragment(fragmentId: string) {
      const res = await fetch(
        `${TEST_ENV.SUPABASE_URL}/rest/v1/fragments?fragment_id=eq.${fragmentId}&select=*`,
        { headers },
      );
      const data = await res.json();
      return data[0] ?? null;
    },

    async getArtifacts(fragmentId: string) {
      const res = await fetch(
        `${TEST_ENV.SUPABASE_URL}/rest/v1/derived_artifacts?fragment_id=eq.${fragmentId}&select=*`,
        { headers },
      );
      return res.json();
    },

    async getRelations(fragmentId: string) {
      const res = await fetch(
        `${TEST_ENV.SUPABASE_URL}/rest/v1/relations?or=(source_object_id.eq.${fragmentId},target_object_id.eq.${fragmentId})&select=*`,
        { headers },
      );
      return res.json();
    },

    async getCandidates() {
      const res = await fetch(
        `${TEST_ENV.SUPABASE_URL}/rest/v1/derived_objects?status=in.(candidate,dismissed,postponed)&select=*&order=updated_at.desc`,
        { headers },
      );
      return res.json();
    },

    async getProcessingJobs(fragmentId: string) {
      const res = await fetch(
        `${TEST_ENV.SUPABASE_URL}/rest/v1/processing_jobs?fragment_id=eq.${fragmentId}&select=*`,
        { headers },
      );
      return res.json();
    },

    async listFragments() {
      const res = await fetch(
        `${TEST_ENV.SUPABASE_URL}/rest/v1/fragments?select=*&order=created_at.desc`,
        { headers },
      );
      return res.json();
    },
  };
}
