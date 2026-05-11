import { randomUUID } from 'node:crypto';
import type { Fragment } from '@frag-note/domain';
import type { CandidateResult } from './types.js';

export type { CandidateResult } from './types.js';

export function buildEntityCandidates(fragments: Fragment[]): CandidateResult[] {
  const entityMap = new Map<string, Fragment[]>();

  for (const fragment of fragments) {
    const entities = ((fragment.titleOptional ?? fragment.rawTextOptional ?? '')
      .match(/\b[A-Z][A-Za-z0-9]+\b/g) ?? [])
      .filter((token) => token.length >= 3);

    for (const entity of entities) {
      const group = entityMap.get(entity) ?? [];
      entityMap.set(entity, [...group, fragment]);
    }
  }

  const now = new Date().toISOString();
  return [...entityMap.entries()]
    .filter(([, cluster]) => cluster.length >= 2)
    .map(([entity, cluster]) => ({
      object: {
        objectId: randomUUID(),
        objectType: 'entity' as const,
        status: 'candidate' as const,
        title: entity,
        summary: `Fragments repeatedly mention ${entity}.`,
        keyEntities: [entity],
        citations: cluster.slice(0, 3).map((fragment) => ({
          fragmentId: fragment.fragmentId,
          locator: {
            kind: 'text_span' as const,
            value: '0:42',
          },
          supportPath: 'direct' as const,
        })),
        relationEdges: [],
        ruleVersion: 'heuristic-v1',
        createdAt: now,
        updatedAt: now,
      },
      fragmentIds: cluster.map((fragment) => fragment.fragmentId),
    }));
}
