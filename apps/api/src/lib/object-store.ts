import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export type ObjectStoreClient = {
  kind: 's3-compatible';
  endpoint: string;
  bucket: string;
  putObject(key: string, body: Uint8Array | string): Promise<void>;
};

export type ObjectStoreConfig = {
  endpoint: string;
  bucket: string;
};

export function createObjectStore(config: ObjectStoreConfig): ObjectStoreClient {
  return {
    kind: 's3-compatible',
    endpoint: config.endpoint,
    bucket: config.bucket,
    async putObject(key, body) {
      const baseDir = resolve(process.cwd(), 'storage', config.bucket);
      const targetPath = resolve(baseDir, key);
      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(targetPath, body);
    },
  };
}
