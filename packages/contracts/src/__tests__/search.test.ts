import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  searchQueryContractSchema,
  searchResultContractSchema,
} from '../search.ts';
import {
  seedAnswer,
  seedCandidate,
  seedDerivedArtifact,
  seedFragments,
} from '@sui-note/testing';

const testDir = dirname(fileURLToPath(import.meta.url));
const searchEntryUrl = pathToFileURL(resolve(testDir, '../search.ts')).href;

describe('search contracts', () => {
  it('loads the raw TypeScript search contract entrypoint with native Node ESM resolution', () => {
    expect(() =>
      execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          "import(process.argv[1]).catch((error) => { console.error(error); process.exit(1); })",
          searchEntryUrl,
        ],
        {
          cwd: resolve(testDir, '../../..'),
          stdio: 'pipe',
        },
      ),
    ).not.toThrow();
  });

  it('limits result object types to the search surface', () => {
    expect(searchResultContractSchema.shape.objectType.options).toEqual([
      'fragment',
      'artifact',
      'derived_object',
      'answer',
    ]);
  });

  it('accepts canonical query and result payloads', () => {
    const query = searchQueryContractSchema.parse({
      queryText: seedAnswer.queryText,
      queryType: seedAnswer.queryType,
    });

    const result = searchResultContractSchema.parse({
      objectId: seedCandidate.objectId,
      objectType: 'derived_object',
      score: 0.91,
      citations: [
        {
          fragmentId: seedFragments.topicCluster[0].fragmentId,
          locator: seedDerivedArtifact.citations[0].locator,
        },
      ],
    });

    expect(query.queryType).toBe('natural_language');
    expect(result.citations[0].fragmentId).toBe(
      seedFragments.topicCluster[0].fragmentId,
    );
  });

  it('rejects undeclared query and result fields', () => {
    expect(() =>
      searchQueryContractSchema.parse({
        queryText: seedAnswer.queryText,
        queryType: seedAnswer.queryType,
        debug: true,
      }),
    ).toThrow();

    expect(() =>
      searchResultContractSchema.parse({
        objectId: seedCandidate.objectId,
        objectType: 'derived_object',
        score: 0.91,
        citations: [
          {
            fragmentId: seedFragments.topicCluster[0].fragmentId,
            locator: seedDerivedArtifact.citations[0].locator,
            debug: true,
          },
        ],
      }),
    ).toThrow();
  });

  it('rejects unknown result object types', () => {
    expect(() =>
      searchResultContractSchema.parse({
        objectId: seedCandidate.objectId,
        objectType: 'project',
        score: 0.91,
        citations: [],
      }),
    ).toThrow();
  });
});
