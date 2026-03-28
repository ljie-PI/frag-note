import Fastify from 'fastify';
import { registerHealthRoute } from './routes/health.js';

export function buildApp() {
  const app = Fastify();

  registerHealthRoute(app);

  return app;
}
