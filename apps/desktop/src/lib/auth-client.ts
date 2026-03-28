import {
  createDeviceSessionRequestSchema,
  createDeviceSessionResponseSchema,
  type CreateDeviceSessionResponse,
} from '@sui-note/contracts/auth';

export interface AuthClientFetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export interface AuthClientFetch {
  (
    input: string,
    init: {
      method: string;
      headers: Record<string, string>;
      body: string;
      signal?: unknown;
    },
  ): Promise<AuthClientFetchResponse>;
}

export interface CreateAuthClientOptions {
  baseUrl: string;
  fetchImpl: AuthClientFetch;
}

export function createAuthClient({
  baseUrl,
  fetchImpl,
}: CreateAuthClientOptions) {
  return {
    async createDeviceSession(signal?: unknown): Promise<CreateDeviceSessionResponse> {
      const response = await fetchImpl(`${baseUrl}/v1/auth/device-session`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(createDeviceSessionRequestSchema.parse({})),
        signal,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to create device session: HTTP ${response.status}`,
        );
      }

      return createDeviceSessionResponseSchema.parse(await response.json());
    },
  };
}
