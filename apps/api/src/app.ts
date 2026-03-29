import Fastify from 'fastify';
import {
  AuthorizationError,
  createSupabaseAuthResolver,
  type AuthResolver,
} from './lib/request-auth.js';
import { registerAuthRoute } from './routes/auth.js';
import { registerDerivedObjectRoutes } from './routes/derived-objects.js';
import { registerFragmentRoutes } from './routes/fragments.js';
import { registerHealthRoute } from './routes/health.js';
import { registerSearchRoutes } from './routes/search.js';
import { createSupabaseRuntime } from './runtime/supabase-runtime.js';
import type { ApiRuntime } from './runtime/runtime.js';

export function buildApp(
  options: { runtime?: ApiRuntime; authResolver?: AuthResolver } = {},
) {
  const app = Fastify();
  const runtime = options.runtime ?? createSupabaseRuntime();
  const authResolver = options.authResolver ?? createSupabaseAuthResolver();

  registerAuthRoute(app, runtime, authResolver);
  registerHealthRoute(app);
  registerFragmentRoutes(app, runtime, authResolver);
  registerDerivedObjectRoutes(app, runtime, authResolver);
  registerSearchRoutes(app, runtime, authResolver);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AuthorizationError) {
      reply.code(401).send({ error: error.message });
      return;
    }

    reply.code(500).send({ error: error.message });
  });

  return app;
}
