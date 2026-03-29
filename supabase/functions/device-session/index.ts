import { corsHeaders } from '../_shared/cors.ts';
import { createServiceHeaders, requireAuth } from '../_shared/auth.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await requireAuth(request);
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is required');
    }

    const headers = createServiceHeaders();
    const createdAt = new Date().toISOString();

    await fetch(`${supabaseUrl}/rest/v1/users`, {
      method: 'POST',
      headers: {
        ...headers,
        prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        user_id: auth.userId,
        created_at: createdAt,
      }),
    });

    const deviceSessionId = crypto.randomUUID();

    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/device_sessions`, {
      method: 'POST',
      headers: {
        ...headers,
        prefer: 'return=representation',
      },
      body: JSON.stringify({
        device_session_id: deviceSessionId,
        user_id: auth.userId,
        created_at: createdAt,
      }),
    });

    if (!insertResponse.ok) {
      throw new Error(await insertResponse.text());
    }

    return Response.json(
      {
        userId: auth.userId,
        deviceSessionId,
        createdAt,
      },
      {
        headers: corsHeaders,
      },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      {
        status: 400,
        headers: corsHeaders,
      },
    );
  }
});
