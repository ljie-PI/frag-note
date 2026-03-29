export type AuthContext = {
  accessToken: string;
  userId: string;
};

export async function requireAuth(request: Request): Promise<AuthContext> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const authorization = request.headers.get('authorization');

  if (!supabaseUrl || !anonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
  }

  if (!authorization || !authorization.toLowerCase().startsWith('bearer ')) {
    throw new Error('Authorization bearer token is required');
  }

  const accessToken = authorization.slice('Bearer '.length).trim();
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to resolve Supabase user');
  }

  const payload = (await response.json()) as { id?: string };

  if (!payload.id) {
    throw new Error('Supabase user payload did not include id');
  }

  return {
    accessToken,
    userId: payload.id,
  };
}

export function createServiceHeaders() {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  }

  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    'content-type': 'application/json',
  };
}
