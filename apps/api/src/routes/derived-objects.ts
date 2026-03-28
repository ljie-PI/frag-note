import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppState } from '../services/app-state.js';
import {
  mergeDerivedObjects,
} from '../services/derived-object-merge.js';
import {
  getDerivedObjectDetail,
  listDerivedObjectCandidates,
} from '../services/derived-object-query.js';
import {
  confirmDerivedObject,
  dismissDerivedObject,
  postponeDerivedObject,
} from '../services/derived-object-review.js';
import { reviewDerivedObjectUpdates } from '../services/derived-object-update-review.js';

export function registerDerivedObjectRoutes(
  app: FastifyInstance,
  state: AppState,
) {
  app.get('/v1/derived-objects/candidates', async () =>
    listDerivedObjectCandidates(state),
  );

  app.get('/v1/derived-objects/:id', async (request, reply) => {
    const params = z.strictObject({ id: z.string().uuid() }).safeParse(request.params);

    if (!params.success) {
      reply.code(400);
      return { error: 'Invalid object id' };
    }

    const candidate = getDerivedObjectDetail(state, params.data.id);

    if (!candidate) {
      reply.code(404);
      return { error: 'Derived object not found' };
    }

    return candidate;
  });

  for (const action of [
    {
      path: 'confirm',
      handler: confirmDerivedObject,
    },
    {
      path: 'dismiss',
      handler: dismissDerivedObject,
    },
    {
      path: 'postpone',
      handler: postponeDerivedObject,
    },
  ] as const) {
    app.post(`/v1/derived-objects/:id/${action.path}`, async (request, reply) => {
      const params = z.strictObject({ id: z.string().uuid() }).safeParse(request.params);

      if (!params.success) {
        reply.code(400);
        return { error: 'Invalid object id' };
      }

      const candidate = action.handler(state, params.data.id);

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

    return reviewDerivedObjectUpdates(state, params.data.id);
  });

  app.post('/v1/derived-objects/:id/merge', async (request, reply) => {
    const params = z.strictObject({ id: z.string().uuid() }).safeParse(request.params);
    const body = z.strictObject({ targetId: z.string().uuid() }).safeParse(request.body);

    if (!params.success || !body.success) {
      reply.code(400);
      return { error: 'Invalid merge request' };
    }

    const merged = mergeDerivedObjects(state, params.data.id, body.data.targetId);

    if (!merged) {
      reply.code(404);
      return { error: 'Derived object not found' };
    }

    return merged;
  });
}
