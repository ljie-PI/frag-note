import { randomUUID } from 'node:crypto';
import type { Fragment } from '@frag-note/domain';
import type { AppState } from '../app-state.js';
import { tokenizeText } from '../text-utils.js';
import type { CandidateResult } from './entity-candidate-service.js';

export function buildTopicCandidates(
  fragments: Fragment[],
  state?: AppState,
): CandidateResult[] {
  const keywordMap = new Map<string, Fragment[]>();

  for (const fragment of fragments) {
    for (const keyword of tokenizeText(
      fragment.titleOptional,
      fragment.rawTextOptional,
    )) {
      const group = keywordMap.get(keyword) ?? [];
      keywordMap.set(keyword, [...group, fragment]);
    }
  }

  const candidates: CandidateResult[] = [];

  for (const [keyword, cluster] of keywordMap.entries()) {
    if (cluster.length < 3) {
      continue;
    }

    const candidateKey = `topic:${keyword}`;
    if (state?.dismissedCandidateKeys.has(candidateKey)) {
      continue;
    }

    const now = new Date().toISOString();
    candidates.push({
      object: {
        objectId: randomUUID(),
        objectType: 'topic',
        status: 'candidate',
        title: `${keyword.toUpperCase()} research`,
        summary: `Fragments clustered around ${keyword.toUpperCase()}.`,
        keyEntities: [keyword.toUpperCase()],
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
    });
  }

  return candidates;
}
