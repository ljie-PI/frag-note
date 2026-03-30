import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return Response.json(
    {
      error:
        'search-query is deprecated. Use API route POST /v1/search with Authorization bearer token.',
    },
    {
      status: 410,
      headers: corsHeaders,
    },
  );
});
