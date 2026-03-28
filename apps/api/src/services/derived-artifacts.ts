import { randomUUID } from 'node:crypto';
import type { Citation, DerivedArtifact, Fragment } from '@sui-note/domain';
import { generateSummaryAndTags } from '../workers/providers/llm-provider.js';
import { runOcr } from '../workers/providers/ocr-provider.js';
import { transcribeVoice } from '../workers/providers/transcription-provider.js';

export function buildDerivedArtifactsForFragment(
  fragment: Fragment,
): DerivedArtifact[] {
  const aiOutput = generateSummaryAndTags(fragment);
  const artifacts: DerivedArtifact[] = [
    createArtifact(fragment, 'summary', {
      text: aiOutput.summary,
    }),
    createArtifact(fragment, 'tags', {
      tags: aiOutput.tags,
    }),
    createArtifact(fragment, 'embedding', {
      vector: aiOutput.embeddingKeywords.map(
        (keyword, index) => keyword.length + index,
      ),
      keywords: aiOutput.embeddingKeywords,
    }),
  ];

  if (fragment.sourceType === 'image' || fragment.sourceType === 'screenshot' || fragment.sourceType === 'pdf') {
    artifacts.push(
      createArtifact(fragment, 'ocr', runOcr(fragment)),
    );
  }

  if (fragment.sourceType === 'voice') {
    artifacts.push(
      createArtifact(fragment, 'transcript', transcribeVoice(fragment)),
    );
  }

  return artifacts;
}

function createArtifact(
  fragment: Fragment,
  artifactType: DerivedArtifact['artifactType'],
  content: DerivedArtifact['content'],
): DerivedArtifact {
  return {
    artifactId: randomUUID(),
    fragmentId: fragment.fragmentId,
    artifactType,
    version: 'v1',
    content,
    providerMetadata: {
      provider: 'in-memory',
      model: 'heuristic',
    },
    createdAt: new Date().toISOString(),
    citations: [buildDirectCitation(fragment.fragmentId)],
  };
}

function buildDirectCitation(fragmentId: string): Citation {
  return {
    fragmentId,
    locator: {
      kind: 'text_span',
      value: '0:42',
    },
    supportPath: 'direct',
  };
}
