import { describe, expect, it } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const testDir = dirname(fileURLToPath(import.meta.url));
const domainEntryUrl = pathToFileURL(
  resolve(testDir, '../../packages/domain/src/index.ts'),
).href;
const repoRoot = resolve(testDir, '../..');

function collectTypeScriptFiles(dir: string): string[] {
  const entries = readdirSync(dir).sort();

  return entries.flatMap((entry) => {
    const fullPath = resolve(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      return collectTypeScriptFiles(fullPath);
    }

    return fullPath.endsWith('.ts') ? [fullPath] : [];
  });
}

describe('workspace packages', () => {
  it('loads the canonical package entrypoints', async () => {
    const domain = await import('@sui-note/domain');
    expect(domain).toBeDefined();
  });

  it('loads the raw TypeScript entrypoint with native Node ESM resolution', () => {
    expect(() =>
      execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          "import(process.argv[1]).catch((error) => { console.error(error); process.exit(1); })",
          domainEntryUrl,
        ],
        {
          cwd: repoRoot,
          stdio: 'pipe',
        },
      ),
    ).not.toThrow();
  });

  it('uses explicit .ts extensions for raw TypeScript workspace package imports', () => {
    const rawTypeScriptRoots = [
      resolve(repoRoot, 'packages/domain/src'),
      resolve(repoRoot, 'packages/contracts/src'),
      resolve(repoRoot, 'packages/testing/src'),
    ];
    const extensionlessSpecifierPattern =
      /(?:import|export)\s(?:[^'"]*from\s)?['"](\.\.?(?:\/[^'".]+)+)['"]/g;

    const offenders = rawTypeScriptRoots.flatMap((root) =>
      collectTypeScriptFiles(root).flatMap((filePath) => {
        const source = readFileSync(filePath, 'utf8');

        return [...source.matchAll(extensionlessSpecifierPattern)].map(
          ([, specifier]) =>
            `${fileURLToPath(pathToFileURL(filePath))}:${specifier}`,
        );
      }),
    );

    expect(offenders).toEqual([]);
  });
});
