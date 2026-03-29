import { createSupabaseRuntimeClients } from './supabase.js';

export type ObjectStoreClient = {
  kind: 'supabase-storage';
  bucket: string;
  putObject(key: string, body: Uint8Array | string): Promise<void>;
};

export type ObjectStoreConfig = {
  bucket: string;
};

export function createObjectStore(config: ObjectStoreConfig): ObjectStoreClient {
  const { serviceClient } = createSupabaseRuntimeClients();

  return {
    kind: 'supabase-storage',
    bucket: config.bucket,
    async putObject(key, body) {
      const payload =
        typeof body === 'string' ? new TextEncoder().encode(body) : body;

      const { error } = await serviceClient.storage
        .from(config.bucket)
        .upload(key, payload, {
          upsert: true,
          contentType: 'application/octet-stream',
        });

      if (error) {
        throw new Error(error.message);
      }
    },
  };
}
