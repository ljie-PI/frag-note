import Fastify from 'fastify';
import { registerAuthRoute } from './routes/auth.js';
import { registerDerivedObjectRoutes } from './routes/derived-objects.js';
import { registerFragmentRoutes } from './routes/fragments.js';
import { registerHealthRoute } from './routes/health.js';
import { registerSearchRoutes } from './routes/search.js';
import { createAppState } from './services/app-state.js';

export function buildApp() {
  const app = Fastify();
  const state = createAppState();

  registerAuthRoute(app);
  registerHealthRoute(app);
  registerFragmentRoutes(app, state);
  registerDerivedObjectRoutes(app, state);
  registerSearchRoutes(app, state);

  return app;
}
