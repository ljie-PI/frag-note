import { fileURLToPath } from 'node:url';
import { buildApp } from './app.js';
import type { AuthResolver } from './lib/request-auth.js';
import type { ApiRuntime } from './runtime/runtime.js';

const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_PORT = 3000;

export async function startServer(
  options: { runtime?: ApiRuntime; authResolver?: AuthResolver } = {},
) {
  const app = buildApp(options);

  try {
    await app.listen({
      host: process.env.HOST ?? DEFAULT_HOST,
      port: parsePort(process.env.PORT),
    });
  } catch (error) {
    await app.close();
    throw error;
  }

  return app;
}

function parsePort(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_PORT;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error('PORT must be a valid integer');
  }

  const parsedValue = Number(value);

  if (!Number.isSafeInteger(parsedValue)) {
    throw new Error('PORT must be a valid integer');
  }

  return parsedValue;
}

function isMainModule(metaUrl: string): boolean {
  const entrypoint = process.argv[1];

  if (entrypoint === undefined) {
    return false;
  }

  return fileURLToPath(metaUrl) === entrypoint;
}

if (isMainModule(import.meta.url)) {
  startServer().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
