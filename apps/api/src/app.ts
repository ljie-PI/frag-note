import Fastify from 'fastify';
import { registerAuthRoute } from './routes/auth.js';
import { registerHealthRoute } from './routes/health.js';

export function buildApp() {
  const app = Fastify();

  registerAuthRoute(app);
  registerHealthRoute(app);

  return app;
}
