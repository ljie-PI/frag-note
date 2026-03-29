import type { FastifyInstance } from 'fastify';
import {
  createDeviceSessionRequestSchema,
  createDeviceSessionResponseSchema,
} from '@sui-note/contracts/auth';
import type { AuthResolver } from '../lib/request-auth.js';
import type { ApiRuntime } from '../runtime/runtime.js';

export function registerAuthRoute(
  app: FastifyInstance,
  runtime: ApiRuntime,
  authResolver: AuthResolver,
) {
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

    const auth = await authResolver(request);
    return createDeviceSessionResponseSchema.parse(
      await runtime.createDeviceSession(auth),
    );
  });
}
