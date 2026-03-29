import { randomUUID } from 'node:crypto';
import type { Citation, DerivedArtifact, Fragment } from '@sui-note/domain';
import {
  parseFragmentPayload,
  type FragmentAssetPointer,
} from './fragment-content.js';
import {
  generateSummaryAndTags,
  generateSummaryTagsAndEmbedding,
} from '../workers/providers/llm-provider.js';
import { runOcr, runOcrForAsset } from '../workers/providers/ocr-provider.js';
import {
  transcribeVoice,
  transcribeVoiceAsset,
} from '../workers/providers/transcription-provider.js';

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

export async function buildDerivedArtifactsForFragmentAsync(
  fragment: Fragment,
  assets: Array<
    FragmentAssetPointer & {
      bytes?: Uint8Array;
    }
  > = [],
): Promise<DerivedArtifact[]> {
  const parsedPayload = parseFragmentPayload(fragment.rawTextOptional);
  const supplementalText: string[] = [];
  const artifacts: DerivedArtifact[] = [];
  const primaryAsset = assets[0] ?? parsedPayload.assets[0] ?? null;

  if (
    fragment.sourceType === 'image' ||
    fragment.sourceType === 'screenshot' ||
    fragment.sourceType === 'pdf'
  ) {
    const ocr = await runOcrForAsset(fragment, primaryAsset);
    artifacts.push(
      createArtifact(
        fragment,
        'ocr',
        { text: ocr.text },
        {
          provider: ocr.provider,
          model: ocr.model,
        },
      ),
    );
    if (ocr.text.trim().length > 0) {
      supplementalText.push(ocr.text);
    }
  }

  if (fragment.sourceType === 'voice') {
    const transcript = await transcribeVoiceAsset(fragment, primaryAsset);
    artifacts.push(
      createArtifact(
        fragment,
        'transcript',
        { text: transcript.text },
        {
          provider: transcript.provider,
          model: transcript.model,
        },
      ),
    );
    if (transcript.text.trim().length > 0) {
      supplementalText.push(transcript.text);
    }
  }

  const aiOutput = await generateSummaryTagsAndEmbedding(fragment, supplementalText);
  artifacts.unshift(
    createArtifact(
      fragment,
      'summary',
      { text: aiOutput.summary },
      {
        provider: aiOutput.provider,
        model: aiOutput.model,
      },
    ),
    createArtifact(
      fragment,
      'tags',
      { tags: aiOutput.tags },
      {
        provider: aiOutput.provider,
        model: aiOutput.model,
      },
    ),
    createArtifact(
      fragment,
      'embedding',
      {
        vector: aiOutput.embedding,
        keywords: aiOutput.embeddingKeywords,
      },
      {
        provider: aiOutput.provider,
        model: aiOutput.model,
      },
    ),
  );

  return artifacts;
}

function createArtifact(
  fragment: Fragment,
  artifactType: DerivedArtifact['artifactType'],
  content: DerivedArtifact['content'],
  providerMetadata: DerivedArtifact['providerMetadata'] = {
    provider: 'in-memory',
    model: 'heuristic',
  },
): DerivedArtifact {
  return {
    artifactId: randomUUID(),
    fragmentId: fragment.fragmentId,
    artifactType,
    version: 'v1',
    content,
    providerMetadata,
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
