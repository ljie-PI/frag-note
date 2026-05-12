import { spawn, type ChildProcess } from 'node:child_process';
import { TEST_ENV } from './test-env.ts';

export type Services = {
  server: ChildProcess;
  worker: ChildProcess;
  stop: () => void;
};

export async function startServices(): Promise<Services> {
  const port = TEST_ENV.API_PORT;
  const env = {
    ...process.env,
    SUPABASE_URL: TEST_ENV.SUPABASE_URL,
    SUPABASE_ANON_KEY: TEST_ENV.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: TEST_ENV.SUPABASE_SERVICE_ROLE_KEY,
    HOST: '127.0.0.1',
    PORT: port,
  };

  const server = spawn('bun', ['run', 'apps/api/dist/server.js'], {
    env,
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout?.resume();
  server.stderr?.resume();

  const worker = spawn('bun', ['run', 'apps/api/dist/worker.js'], {
    env,
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  worker.stdout?.resume();
  worker.stderr?.resume();

  // Wait for server to be ready
  const start = Date.now();
  let ready = false;
  while (Date.now() - start < 10_000) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {
      /* not ready yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  if (!ready) {
    server.kill();
    worker.kill();
    throw new Error(`API server did not become ready on port ${port} within 10s`);
  }

  return {
    server,
    worker,
    stop() {
      server.kill();
      worker.kill();
    },
  };
}
