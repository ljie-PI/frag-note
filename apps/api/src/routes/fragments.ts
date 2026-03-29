import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AuthResolver } from '../lib/request-auth.js';
import type { ApiRuntime } from '../runtime/runtime.js';

const createFragmentRequestSchema = z.strictObject({
  sourceType: z.enum(['text', 'image', 'link', 'screenshot', 'pdf', 'voice']),
  rawText: z.string().nullable().optional(),
  titleOptional: z.string().nullable().optional(),
});

export function registerFragmentRoutes(
  app: FastifyInstance,
  runtime: ApiRuntime,
  authResolver: AuthResolver,
) {
  app.get('/v1/fragments', async (request) => {
    const auth = await authResolver(request);
    return {
      fragments: await runtime.listFragments(auth),
    };
  });

  app.get('/v1/fragments/:id', async (request, reply) => {
    const params = z.strictObject({ id: z.string().uuid() }).safeParse(request.params);

    if (!params.success) {
      reply.code(400);
      return { error: 'Invalid fragment id' };
    }

    const auth = await authResolver(request);
    const detail = await runtime.getFragmentDetail(auth, params.data.id);

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

    reply.code(202);
    const auth = await authResolver(request);
    return runtime.ingestFragment(auth, parsedRequest.data);
  });

  app.post('/v1/fragments/:id/retry', async (request, reply) => {
    const params = z.strictObject({ id: z.string().uuid() }).safeParse(request.params);

    if (!params.success) {
      reply.code(400);
      return { error: 'Invalid fragment id' };
    }

    const auth = await authResolver(request);
    const retried = await runtime.retryFragmentProcessing(auth, params.data.id);

    if (!retried) {
      reply.code(404);
      return { error: 'Fragment not found' };
    }

    reply.code(202);
    return retried;
  });
}
