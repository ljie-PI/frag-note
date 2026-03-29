import Fastify from 'fastify';
import { shouldUseSupabaseRuntime } from './lib/supabase.js';
import { registerAuthRoute } from './routes/auth.js';
import { registerDerivedObjectRoutes } from './routes/derived-objects.js';
import { registerFragmentRoutes } from './routes/fragments.js';
import { registerHealthRoute } from './routes/health.js';
import { registerSearchRoutes } from './routes/search.js';
import { createInMemoryRuntime } from './runtime/in-memory-runtime.js';
import { createSupabaseRuntime } from './runtime/supabase-runtime.js';
import type { ApiRuntime } from './runtime/runtime.js';

export function buildApp(options: { runtime?: ApiRuntime } = {}) {
  const app = Fastify();
  const runtime =
    options.runtime ??
    (shouldUseSupabaseRuntime()
      ? createSupabaseRuntime()
      : createInMemoryRuntime());

  registerAuthRoute(app, runtime);
  registerHealthRoute(app);
  registerFragmentRoutes(app, runtime);
  registerDerivedObjectRoutes(app, runtime);
  registerSearchRoutes(app, runtime);

  return app;
}
