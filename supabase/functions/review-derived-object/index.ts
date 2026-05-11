import { corsHeaders } from '../_shared/cors.ts';
import { createServiceHeaders, requireAuth } from '../_shared/auth.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await requireAuth(request);
    const payload = (await request.json()) as {
      objectId?: string;
      action?: 'confirm' | 'dismiss' | 'postpone';
    };

    if (!payload.objectId || !payload.action) {
      throw new Error('objectId and action are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is required');
    }

    const status =
      payload.action === 'confirm'
        ? 'confirmed'
        : payload.action === 'dismiss'
          ? 'dismissed'
          : 'postponed';
    const headers = createServiceHeaders();
    const response = await fetch(
      `${supabaseUrl}/rest/v1/derived_objects?object_id=eq.${payload.objectId}&user_id=eq.${auth.userId}&select=*`,
      {
        method: 'PATCH',
        headers: {
          ...headers,
          prefer: 'return=representation',
        },
        body: JSON.stringify({
          status,
          updated_at: new Date().toISOString(),
        }),
      },
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const rows = (await response.json()) as Array<Record<string, unknown>>;
    const object = rows[0];

    if (!object) {
      return Response.json(
        { error: 'Derived object not found' },
        {
          status: 404,
          headers: corsHeaders,
        },
      );
    }

    return Response.json(
      {
        objectId: String(object.object_id),
        objectType: object.object_type,
        status: object.status,
        title: object.title,
        summary: object.summary,
        keyEntities: Array.isArray(object.key_entities) ? object.key_entities : [],
        citations: Array.isArray(object.citations) ? object.citations : [],
        relationEdges: Array.isArray(object.relation_edges)
          ? object.relation_edges
          : [],
        ruleVersion: String(object.rule_version),
        createdAt: String(object.created_at),
        updatedAt: String(object.updated_at),
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
