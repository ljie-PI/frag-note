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
      sourceType?: 'text' | 'image' | 'link' | 'screenshot' | 'pdf' | 'voice';
      titleOptional?: string | null;
      rawTextOptional?: string | null;
      createdAt?: string;
      assetRows?: Array<Record<string, unknown>>;
    };

    if (!payload.fragmentId || !payload.sourceType || !payload.createdAt) {
      throw new Error('fragmentId, sourceType, and createdAt are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is required');
    }

    const headers = createServiceHeaders();
    const now = new Date().toISOString();

    await fetch(`${supabaseUrl}/rest/v1/users`, {
      method: 'POST',
      headers: {
        ...headers,
        prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        user_id: auth.userId,
        created_at: payload.createdAt,
      }),
    });

    const fragmentInsert = await fetch(`${supabaseUrl}/rest/v1/fragments`, {
      method: 'POST',
      headers: {
        ...headers,
        prefer: 'return=minimal',
      },
      body: JSON.stringify({
        fragment_id: payload.fragmentId,
        user_id: auth.userId,
        source_type: payload.sourceType,
        origin_kind: 'user_capture',
        title_optional: payload.titleOptional ?? null,
        raw_text_optional: payload.rawTextOptional ?? null,
        status: 'processing',
        device_metadata: {
          platform: 'desktop',
          captureMethod: 'supabase_direct',
          appVersion: '0.1.0',
          deviceName: 'desktop',
        },
        language_hint_optional: 'en',
        created_at: payload.createdAt,
        updated_at: payload.createdAt,
      }),
    });

    if (!fragmentInsert.ok) {
      throw new Error(await fragmentInsert.text());
    }

    if (Array.isArray(payload.assetRows) && payload.assetRows.length > 0) {
      const assetInsert = await fetch(`${supabaseUrl}/rest/v1/assets`, {
        method: 'POST',
        headers: {
          ...headers,
          prefer: 'return=minimal',
        },
        body: JSON.stringify(payload.assetRows.map((row) => ({
          ...row,
          user_id: auth.userId,
        }))),
      });

      if (!assetInsert.ok) {
        throw new Error(await assetInsert.text());
      }
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
        job_type: inferPrimaryJobType(payload.sourceType),
        status: 'queued',
        attempt_count: 0,
        provider: 'supabase-edge',
        payload: {
          sourceType: payload.sourceType,
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
