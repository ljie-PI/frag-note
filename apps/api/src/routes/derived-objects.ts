import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ApiRuntime } from '../runtime/runtime.js';

export function registerDerivedObjectRoutes(
  app: FastifyInstance,
  runtime: ApiRuntime,
) {
  app.get('/v1/derived-objects/candidates', async () =>
    runtime.listDerivedObjectCandidates(),
  );

  app.get('/v1/derived-objects/:id', async (request, reply) => {
    const params = z.strictObject({ id: z.string().uuid() }).safeParse(request.params);

    if (!params.success) {
      reply.code(400);
      return { error: 'Invalid object id' };
    }

    const candidate = await runtime.getDerivedObjectDetail(params.data.id);

    if (!candidate) {
      reply.code(404);
      return { error: 'Derived object not found' };
    }

    return candidate;
  });

  for (const action of [
    {
      path: 'confirm',
      action: 'confirm',
    },
    {
      path: 'dismiss',
      action: 'dismiss',
    },
    {
      path: 'postpone',
      action: 'postpone',
    },
  ] as const) {
    app.post(`/v1/derived-objects/:id/${action.path}`, async (request, reply) => {
      const params = z.strictObject({ id: z.string().uuid() }).safeParse(request.params);

      if (!params.success) {
        reply.code(400);
        return { error: 'Invalid object id' };
      }

      const candidate = await runtime.reviewDerivedObject(
        params.data.id,
        action.action,
      );

      if (!candidate) {
        reply.code(404);
        return { error: 'Derived object not found' };
      }

      return candidate;
    });
  }

  app.get('/v1/derived-objects/:id/update-suggestions', async (request, reply) => {
    const params = z.strictObject({ id: z.string().uuid() }).safeParse(request.params);

    if (!params.success) {
      reply.code(400);
      return { error: 'Invalid object id' };
    }

    return runtime.reviewDerivedObjectUpdates(params.data.id);
  });

  app.post('/v1/derived-objects/:id/merge', async (request, reply) => {
    const params = z.strictObject({ id: z.string().uuid() }).safeParse(request.params);
    const body = z.strictObject({ targetId: z.string().uuid() }).safeParse(request.body);

    if (!params.success || !body.success) {
      reply.code(400);
      return { error: 'Invalid merge request' };
    }

    const merged = await runtime.mergeDerivedObjects(
      params.data.id,
      body.data.targetId,
    );

    if (!merged) {
      reply.code(404);
      return { error: 'Derived object not found' };
    }

    return merged;
  });
}
