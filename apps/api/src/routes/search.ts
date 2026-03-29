import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AuthResolver } from '../lib/request-auth.js';
import type { ApiRuntime } from '../runtime/runtime.js';

const searchRequestSchema = z.strictObject({
  queryText: z.string(),
  queryType: z.enum(['keyword', 'natural_language']).default('natural_language'),
});

const saveAnswerRequestSchema = z.strictObject({
  originKind: z.literal('answer_promotion'),
  sourceQuery: z.string(),
  citedFragmentIds: z.array(z.string().uuid()),
});

export function registerSearchRoutes(
  app: FastifyInstance,
  runtime: ApiRuntime,
  authResolver: AuthResolver,
) {
  app.post('/v1/search', async (request, reply) => {
    const parsedRequest = searchRequestSchema.safeParse(request.body);

    if (!parsedRequest.success) {
      reply.code(400);
      return { error: 'Invalid search payload' };
    }

    const auth = await authResolver(request);
    return runtime.searchKnowledgeBase(auth, parsedRequest.data);
  });

  app.post('/v1/answers/:id/save-as-fragment', async (request, reply) => {
    const params = z.strictObject({ id: z.string().uuid() }).safeParse(request.params);
    const parsedRequest = saveAnswerRequestSchema.safeParse(request.body);

    if (!params.success || !parsedRequest.success) {
      reply.code(400);
      return { error: 'Invalid answer promotion request' };
    }

    const auth = await authResolver(request);
    const promoted = await runtime.saveAnswerAsFragment(auth, params.data.id);

    if (!promoted) {
      reply.code(404);
      return { error: 'Answer not found' };
    }

    reply.code(201);
    return promoted;
  });
}
