import type { ParsedEnv } from './env';

export type ObjectStoreClient = {
  kind: 's3-compatible';
  endpoint: string;
  bucket: string;
  putObject(key: string, body: Uint8Array | string): Promise<void>;
};

export function createObjectStore(
  env: Pick<ParsedEnv, 'objectStore'>,
): ObjectStoreClient {
  return {
    kind: 's3-compatible',
    endpoint: env.objectStore.endpoint,
    bucket: env.objectStore.bucket,
    async putObject() {
      throw new Error('Object storage integration is not implemented yet.');
    },
  };
}
