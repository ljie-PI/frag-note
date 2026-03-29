import { corsHeaders } from '../_shared/cors.ts';
import { createServiceHeaders, requireAuth } from '../_shared/auth.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await requireAuth(request);
    const payload = (await request.json()) as {
      fragmentId?: string;
    };

    if (!payload.fragmentId) {
      throw new Error('fragmentId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is required');
    }

    const headers = createServiceHeaders();
    const fragmentResponse = await fetch(
      `${supabaseUrl}/rest/v1/fragments?select=*&fragment_id=eq.${payload.fragmentId}&user_id=eq.${auth.userId}&limit=1`,
      { headers },
    );

    if (!fragmentResponse.ok) {
      throw new Error(await fragmentResponse.text());
    }

    const fragments = (await fragmentResponse.json()) as Array<{
      fragment_id: string;
      source_type: string;
    }>;
    const fragment = fragments[0];

    if (!fragment) {
      return Response.json(
        { error: 'Fragment not found' },
        {
          status: 404,
          headers: corsHeaders,
        },
      );
    }

    const now = new Date().toISOString();
    const fragmentUpdate = await fetch(
      `${supabaseUrl}/rest/v1/fragments?fragment_id=eq.${payload.fragmentId}&user_id=eq.${auth.userId}`,
      {
        method: 'PATCH',
        headers: {
          ...headers,
          prefer: 'return=minimal',
        },
        body: JSON.stringify({
          status: 'processing',
          updated_at: now,
        }),
      },
    );

    if (!fragmentUpdate.ok) {
      throw new Error(await fragmentUpdate.text());
    }

    const jobInsert = await fetch(`${supabaseUrl}/rest/v1/processing_jobs`, {
      method: 'POST',
      headers: {
        ...headers,
        prefer: 'return=minimal',
      },
      body: JSON.stringify({
        job_id: crypto.randomUUID(),
        fragment_id: payload.fragmentId,
        user_id: auth.userId,
        job_type: inferPrimaryJobType(fragment.source_type),
        status: 'queued',
        attempt_count: 0,
        provider: 'supabase-edge',
        payload: {
          reason: 'manual_retry',
        },
        error_code: null,
        error_message: null,
        claimed_at: null,
        lease_expires_at: null,
        started_at: null,
        completed_at: null,
        created_at: now,
        updated_at: now,
      }),
    });

    if (!jobInsert.ok) {
      throw new Error(await jobInsert.text());
    }

    return Response.json(
      {
        fragmentId: payload.fragmentId,
        status: 'processing',
      },
      { headers: corsHeaders },
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

function inferPrimaryJobType(sourceType: string) {
  switch (sourceType) {
    case 'image':
    case 'screenshot':
    case 'pdf':
      return 'ocr';
    case 'voice':
      return 'transcription';
    default:
      return 'understanding';
  }
}
