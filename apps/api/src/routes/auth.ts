import type { FastifyInstance } from 'fastify';
import { createDeviceSession } from '../services/auth/session-service.js';

export function registerAuthRoute(app: FastifyInstance) {
  app.post('/v1/auth/device-session', async (_request, reply) => {
    reply.code(201);

    return createDeviceSession();
  });
}
