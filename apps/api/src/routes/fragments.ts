import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createFragment,
  getFragmentDetail,
  listFragments,
  processFragment,
} from '../services/fragment-ingestion.js';
import type { AppState } from '../services/app-state.js';

const createFragmentRequestSchema = z.strictObject({
  sourceType: z.enum(['text', 'image', 'link', 'screenshot', 'pdf', 'voice']),
  rawText: z.string().nullable().optional(),
  titleOptional: z.string().nullable().optional(),
});

export function registerFragmentRoutes(app: FastifyInstance, state: AppState) {
  app.get('/v1/fragments', async () => ({
    fragments: listFragments(state),
  }));

  app.get('/v1/fragments/:id', async (request, reply) => {
    const params = z.strictObject({ id: z.string().uuid() }).safeParse(request.params);

    if (!params.success) {
      reply.code(400);
      return { error: 'Invalid fragment id' };
    }

    const detail = getFragmentDetail(state, params.data.id);

    if (!detail) {
      reply.code(404);
      return { error: 'Fragment not found' };
    }

    return detail;
  });

  app.post('/v1/fragments', async (request, reply) => {
    const parsedRequest = createFragmentRequestSchema.safeParse(request.body);

    if (!parsedRequest.success) {
      reply.code(400);
      return { error: 'Invalid fragment payload' };
    }

    const fragment = createFragment(state, parsedRequest.data);
    processFragment(state, fragment.fragmentId);

    reply.code(202);
    return {
      fragmentId: fragment.fragmentId,
      status: 'processing',
    };
  });
}
