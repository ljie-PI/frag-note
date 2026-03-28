import { randomUUID } from 'node:crypto';
import type { DerivedArtifact, Fragment, Relation } from '@sui-note/domain';
import type { AppState } from './app-state.js';
import { tokenizeText } from './text-utils.js';

export function buildRelatedFragmentLinks(
  state: AppState,
  fragment: Fragment,
  artifacts: DerivedArtifact[],
): Relation[] {
  const keywords = new Set(
    artifacts
      .flatMap((artifact) =>
        artifact.artifactType === 'tags'
          ? ((artifact.content.tags as string[] | undefined) ?? [])
          : [],
      )
      .map((keyword) => keyword.toLowerCase()),
  );

  const relations: Relation[] = [];

  for (const existing of state.fragments.values()) {
    if (existing.fragmentId === fragment.fragmentId) {
      continue;
    }

    const overlap = tokenizeText(
      existing.titleOptional,
      existing.rawTextOptional,
    ).filter((keyword) => keywords.has(keyword));

    if (overlap.length === 0) {
      continue;
    }

    relations.push({
      relationId: randomUUID(),
      sourceObjectType: 'fragment',
      sourceObjectId: fragment.fragmentId,
      targetObjectType: 'fragment',
      targetObjectId: existing.fragmentId,
      relationType: 'related_topic',
      confidence: Math.min(0.99, 0.5 + overlap.length * 0.2),
      explanation: `Shared topic keywords: ${overlap.join(', ').toUpperCase()}`,
      createdAt: new Date().toISOString(),
      algorithmVersion: 'heuristic-v1',
    });
  }

  return relations;
}
