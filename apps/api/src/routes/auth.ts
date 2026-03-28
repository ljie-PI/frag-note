import type { FastifyInstance } from 'fastify';
import {
  createDeviceSessionRequestSchema,
  createDeviceSessionResponseSchema,
} from '@sui-note/contracts/auth';
import { createDeviceSession } from '../services/auth/session-service.js';

export function registerAuthRoute(app: FastifyInstance) {
  app.post('/v1/auth/device-session', async (request, reply) => {
    const parsedRequest = createDeviceSessionRequestSchema.safeParse(
      request.body,
    );

    if (!parsedRequest.success) {
      reply.code(400);
      return {
        error: 'Invalid device session request',
      };
    }

    reply.code(201);

    return createDeviceSessionResponseSchema.parse(createDeviceSession());
  });
}
