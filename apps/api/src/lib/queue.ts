import { randomUUID } from 'node:crypto';
import { createSupabaseRuntimeClients } from './supabase.js';

export type QueueClient = {
  kind: 'supabase-jobs';
  enqueue(jobName: string, payload: unknown): Promise<void>;
  drain(): Promise<Array<{ jobName: string; payload: unknown }>>;
};

export function createQueue(): QueueClient {
  const { serviceClient } = createSupabaseRuntimeClients();

  return {
    kind: 'supabase-jobs',
    async enqueue(jobName, payload) {
      const userId =
        typeof payload === 'object' &&
        payload !== null &&
        'userId' in payload &&
        typeof payload.userId === 'string'
          ? payload.userId
          : null;

      if (!userId) {
        throw new Error('Queue payload.userId is required');
      }

      const now = new Date().toISOString();
      const { error } = await serviceClient.from('processing_jobs').insert({
        job_id: randomUUID(),
        fragment_id:
          typeof payload === 'object' &&
          payload !== null &&
          'fragmentId' in payload &&
          typeof payload.fragmentId === 'string'
            ? payload.fragmentId
            : randomUUID(),
        user_id:
          userId,
        job_type: jobName,
        status: 'queued',
        attempt_count: 0,
        provider: 'supabase-queue',
        payload,
        error_code: null,
        error_message: null,
        claimed_at: null,
        lease_expires_at: null,
        started_at: null,
        completed_at: null,
        created_at: now,
        updated_at: now,
      });

      if (error) {
        throw new Error(error.message);
      }
    },
    async drain() {
      const { data, error } = await serviceClient
        .from('processing_jobs')
        .select('job_type, payload')
        .eq('status', 'queued')
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map((row) => ({
        jobName: String(row.job_type),
        payload: row.payload,
      }));
    },
  };
}
