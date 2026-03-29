import { corsHeaders } from '../_shared/cors.ts';
import { createServiceHeaders, requireAuth } from '../_shared/auth.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await requireAuth(request);
    const payload = (await request.json()) as {
      answerId?: string;
      originKind?: 'answer_promotion';
      sourceQuery?: string;
      citedFragmentIds?: string[];
    };

    if (!payload.answerId) {
      throw new Error('answerId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is required');
    }

    const headers = createServiceHeaders();
    const answerResponse = await fetch(
      `${supabaseUrl}/rest/v1/answers?select=*&answer_id=eq.${payload.answerId}&user_id=eq.${auth.userId}&limit=1`,
      { headers },
    );

    if (!answerResponse.ok) {
      throw new Error(await answerResponse.text());
    }

    const answers = (await answerResponse.json()) as Array<{
      answer_id: string;
      query_text: string;
      answer_body: string;
    }>;

    const answer = answers[0];
    if (!answer) {
      throw new Error('Answer not found');
    }

    const fragmentId = crypto.randomUUID();
    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();

    const fragmentInsert = await fetch(`${supabaseUrl}/rest/v1/fragments`, {
      method: 'POST',
      headers: {
        ...headers,
        prefer: 'return=minimal',
      },
      body: JSON.stringify({
        fragment_id: fragmentId,
        user_id: auth.userId,
        source_type: 'answer',
        origin_kind: 'answer_promotion',
        title_optional: answer.query_text,
        raw_text_optional: answer.answer_body,
        status: 'processing',
        device_metadata: {
          platform: 'desktop',
          captureMethod: 'answer_promotion',
          appVersion: '0.1.0',
          deviceName: 'supabase-function',
        },
        language_hint_optional: 'en',
        created_at: now,
        updated_at: now,
      }),
    });

    if (!fragmentInsert.ok) {
      throw new Error(await fragmentInsert.text());
    }

    const jobInsert = await fetch(`${supabaseUrl}/rest/v1/processing_jobs`, {
      method: 'POST',
      headers: {
        ...headers,
        prefer: 'return=minimal',
      },
      body: JSON.stringify({
        job_id: jobId,
        fragment_id: fragmentId,
        user_id: auth.userId,
        job_type: 'understanding',
        status: 'queued',
        attempt_count: 0,
        provider: 'supabase-edge',
        payload: {
          sourceType: 'answer',
          sourceAnswerId: payload.answerId,
          sourceQuery: payload.sourceQuery ?? answer.query_text,
          citedFragmentIds: payload.citedFragmentIds ?? [],
        },
        created_at: now,
        updated_at: now,
      }),
    });

    if (!jobInsert.ok) {
      throw new Error(await jobInsert.text());
    }

    const answerUpdate = await fetch(
      `${supabaseUrl}/rest/v1/answers?answer_id=eq.${payload.answerId}&user_id=eq.${auth.userId}`,
      {
        method: 'PATCH',
        headers: {
          ...headers,
          prefer: 'return=minimal',
        },
        body: JSON.stringify({
          saved_as_fragment: true,
        }),
      },
    );

    if (!answerUpdate.ok) {
      throw new Error(await answerUpdate.text());
    }

    return Response.json(
      {
        fragmentId,
        originKind: 'answer_promotion',
        sourceAnswerId: payload.answerId,
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
