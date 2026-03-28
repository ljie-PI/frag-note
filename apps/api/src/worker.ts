import { fileURLToPath } from 'node:url';

export async function runWorker(): Promise<void> {
  console.info('Worker shell started');
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
