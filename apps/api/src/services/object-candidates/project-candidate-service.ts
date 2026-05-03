import { randomUUID } from 'node:crypto';
import type { DerivedObject, Fragment } from '@frag-note/domain';

export function buildProjectCandidates(fragments: Fragment[]): DerivedObject[] {
  const projectFragments = fragments.filter((fragment) =>
    (fragment.titleOptional ?? fragment.rawTextOptional ?? '')
      .toLowerCase()
      .includes('project'),
  );

  if (projectFragments.length < 2) {
    return [];
  }

  const now = new Date().toISOString();
  return [
    {
      objectId: randomUUID(),
      objectType: 'project',
      status: 'candidate',
      title: 'Project cluster',
      summary: 'Fragments that look like part of the same project.',
      keyEntities: ['PROJECT'],
      supportingFragmentIds: projectFragments.map((fragment) => fragment.fragmentId),
      citations: projectFragments.slice(0, 3).map((fragment) => ({
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
  ];
}
