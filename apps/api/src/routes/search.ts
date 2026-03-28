import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { searchKnowledgeBase, saveAnswerAsFragment } from '../services/search-service.js';
import type { AppState } from '../services/app-state.js';

const searchRequestSchema = z.strictObject({
  queryText: z.string(),
  queryType: z.enum(['keyword', 'natural_language']).default('natural_language'),
});

const saveAnswerRequestSchema = z.strictObject({
  originKind: z.literal('answer_promotion'),
  sourceQuery: z.string(),
  citedFragmentIds: z.array(z.string().uuid()),
});

export function registerSearchRoutes(app: FastifyInstance, state: AppState) {
  app.post('/v1/search', async (request, reply) => {
    const parsedRequest = searchRequestSchema.safeParse(request.body);

    if (!parsedRequest.success) {
      reply.code(400);
      return { error: 'Invalid search payload' };
    }

    return searchKnowledgeBase(state, parsedRequest.data);
  });

  app.post('/v1/answers/:id/save-as-fragment', async (request, reply) => {
    const params = z.strictObject({ id: z.string().uuid() }).safeParse(request.params);
    const parsedRequest = saveAnswerRequestSchema.safeParse(request.body);

    if (!params.success || !parsedRequest.success) {
      reply.code(400);
      return { error: 'Invalid answer promotion request' };
    }

    const promoted = saveAnswerAsFragment(state, params.data.id);

    if (!promoted) {
      reply.code(404);
      return { error: 'Answer not found' };
    }

    reply.code(201);
    return promoted;
  });
}
