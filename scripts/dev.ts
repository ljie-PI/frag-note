import { spawn, type ChildProcess } from 'node:child_process';

const RESET = process.argv.includes('--reset');
const children: ChildProcess[] = [];

function log(msg: string) { console.log(`\x1b[32m[dev]\x1b[0m ${msg}`); }
function warn(msg: string) { console.log(`\x1b[33m[dev]\x1b[0m ${msg}`); }

function run(cmd: string, args: string[], name: string): ChildProcess {
  log(`Starting ${name}...`);
  const child = spawn(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  children.push(child);
  child.on('error', (err) => warn(`${name} error: ${err.message}`));
  return child;
}

function runAndWait(cmd: string, args: string[], name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    log(`${name}...`);
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true, env: process.env });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${name} exited with ${code}`))));
    child.on('error', reject);
  });
}

async function waitForReady(url: string, timeoutMs = 15_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not ready */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timeout waiting for ${url} after ${timeoutMs}ms`);
}

function cleanup() {
  warn('Stopping services...');
  for (const child of children) {
    try { child.kill(); } catch { /* already dead */ }
  }
}

process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('SIGTERM', () => { cleanup(); process.exit(0); });

async function main() {
  // 1. Check Supabase
  const supabase = process.env.SUPABASE_BIN ?? 'supabase';
  try {
    await fetch('http://127.0.0.1:54321/rest/v1/');
    log('Supabase already running');
  } catch {
    await runAndWait(supabase, ['start'], 'Supabase start');
  }

  // 2. Reset DB if requested
  if (RESET) {
    await runAndWait(supabase, ['db', 'reset'], 'Database reset');
  }

  // 3. Edge Functions
  run(supabase, ['functions', 'serve'], 'Edge Functions');
  await new Promise((r) => setTimeout(r, 3000));

  // 4. Build API
  await runAndWait('bun', ['run', '--filter', '@frag-note/api', 'build'], 'API build');

  // 5. API server
  run('bun', ['--env-file=.env', 'run', '--filter', '@frag-note/api', 'start'], 'API server');
  await waitForReady('http://127.0.0.1:3000/health');
  log('API server ready');

  // 6. Worker
  run('bun', ['--env-file=.env', 'run', '--filter', '@frag-note/api', 'start:worker'], 'Worker');

  // 7. Desktop app
  run('bun', ['--env-file=.env', 'run', '--filter', '@frag-note/desktop', 'tauri:dev'], 'Desktop app');

  log('');
  log('All services started!');
  log('  Supabase Studio: http://127.0.0.1:54323');
  log('  API server:      http://127.0.0.1:3000');
  log('  Desktop app:     Tauri window');
  log('');
  log('Press Ctrl+C to stop all services');
}

main().catch((err) => {
  console.error(err);
  cleanup();
  process.exit(1);
});
