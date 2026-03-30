import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return Response.json(
    {
      error:
        'promote-answer is deprecated. Use API route POST /v1/answers/:id/save-as-fragment with Authorization bearer token.',
    },
    {
      status: 410,
      headers: corsHeaders,
    },
  );
});
