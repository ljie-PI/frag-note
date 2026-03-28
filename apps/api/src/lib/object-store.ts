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
    async putObject() {
      throw new Error('Object storage integration is not implemented yet.');
    },
  };
}
