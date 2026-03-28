import type { ParsedEnv } from './env';

export type QueueClient = {
  kind: 'redis';
  url: string;
  enqueue(jobName: string, payload: unknown): Promise<void>;
};

export function createQueue(env: Pick<ParsedEnv, 'redis'>): QueueClient {
  return {
    kind: 'redis',
    url: env.redis.url,
    async enqueue() {
      throw new Error('Queue integration is not implemented yet.');
    },
  };
}
