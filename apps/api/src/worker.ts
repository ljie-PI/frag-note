import { fileURLToPath } from 'node:url';

type RunWorkerOptions = {
  signal?: AbortSignal;
};

export async function runWorker(
  options: RunWorkerOptions = {},
): Promise<void> {
  console.info('Worker shell started');

  if (options.signal?.aborted) {
    return;
  }

  await new Promise<void>((resolve) => {
    const keepAliveInterval = setInterval(() => {
      // Keep the shell process alive until a real worker loop exists.
    }, 60_000);

    const cleanup = () => {
      clearInterval(keepAliveInterval);
      options.signal?.removeEventListener('abort', handleAbort);
      process.off('SIGINT', handleSignal);
      process.off('SIGTERM', handleSignal);
    };

    const handleAbort = () => {
      cleanup();
      resolve();
    };

    const handleSignal = () => {
      cleanup();
      resolve();
    };

    options.signal?.addEventListener('abort', handleAbort, { once: true });
    process.once('SIGINT', handleSignal);
    process.once('SIGTERM', handleSignal);
  });
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
