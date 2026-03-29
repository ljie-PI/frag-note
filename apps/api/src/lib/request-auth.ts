import type { FastifyRequest } from 'fastify';
import { createSupabaseRuntimeClients } from './supabase.js';

export class AuthorizationError extends Error {}

export type RequestAuthContext = {
  userId: string;
  accessToken: string;
};

export type AuthResolver = (
  request: FastifyRequest,
) => Promise<RequestAuthContext>;

export function createSupabaseAuthResolver(): AuthResolver {
  const { env } = createSupabaseRuntimeClients();

  return async (request) => {
    const token = readBearerToken(request);

    if (!token) {
      throw new AuthorizationError('Authorization bearer token is required');
    }

    const response = await fetch(`${env.supabase.url}/auth/v1/user`, {
      headers: {
        apikey: env.supabase.anonKey,
        authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new AuthorizationError(
        'Failed to resolve Supabase user from bearer token',
      );
    }

    const payload = (await response.json()) as { id?: string };

    if (!payload.id) {
      throw new AuthorizationError(
        'Supabase user payload did not include an id',
      );
    }

    return {
      userId: payload.id,
      accessToken: token,
    };
  };
}

function readBearerToken(request: FastifyRequest): string | null {
  const value = request.headers.authorization;

  if (typeof value !== 'string') {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(value.trim());
  return match?.[1] ?? null;
}
