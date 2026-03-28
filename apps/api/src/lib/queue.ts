import type { ParsedEnv } from './env.js';

export type QueueClient = {
  kind: 'redis';
  url: string;
  enqueue(jobName: string, payload: unknown): Promise<void>;
  drain(): Promise<Array<{ jobName: string; payload: unknown }>>;
};

export function createQueue(env: Pick<ParsedEnv, 'redis'>): QueueClient {
  const jobs: Array<{ jobName: string; payload: unknown }> = [];

  return {
    kind: 'redis',
    url: env.redis.url,
    async enqueue(jobName, payload) {
      jobs.push({ jobName, payload });
    },
    async drain() {
      const drained = [...jobs];
      jobs.length = 0;
      return drained;
    },
  };
}
