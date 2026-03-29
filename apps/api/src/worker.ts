import { fileURLToPath } from 'node:url';
import { runSupabaseProcessingLoop } from './runtime/supabase-runtime.js';

type RunWorkerOptions = {
  signal?: AbortSignal;
  runLoop?: (signal?: AbortSignal) => Promise<void>;
};

export async function runWorker(
  options: RunWorkerOptions = {},
): Promise<void> {
  console.info('Worker shell started');

  if (options.signal?.aborted) {
    return;
  }

  await (options.runLoop ?? runSupabaseProcessingLoop)(options.signal);
}

function isMainModule(metaUrl: string): boolean {
  const entrypoint = process.argv[1];

  if (entrypoint === undefined) {
    return false;
  }

  return fileURLToPath(metaUrl) === entrypoint;
}

if (isMainModule(import.meta.url)) {
  runWorker().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
