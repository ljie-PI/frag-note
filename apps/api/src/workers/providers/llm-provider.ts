import type { Fragment } from '@sui-note/domain';
import {
  createEmbeddingVector,
  createSummaryAndTags,
} from '../../lib/openai-client.js';
import { extractFragmentSearchText } from '../../services/fragment-content.js';
import { summarizeText, tokenizeText } from '../../services/text-utils.js';

export function generateSummaryAndTags(fragment: Fragment) {
  const sourceText = extractFragmentSearchText(fragment);
  const keywords = tokenizeText(sourceText);

  return {
    summary: summarizeText(sourceText, fragment.titleOptional),
    tags: keywords.slice(0, 5),
    embeddingKeywords: keywords,
  };
}

export async function generateSummaryTagsAndEmbedding(
  fragment: Fragment,
  supplementalText: string[] = [],
): Promise<{
  summary: string;
  tags: string[];
  embedding: number[];
  embeddingKeywords: string[];
  provider: string;
  model: string;
}> {
  const sourceText = [extractFragmentSearchText(fragment), ...supplementalText]
    .filter((value) => value.trim().length > 0)
    .join('\n\n')
    .trim();
  const heuristic = generateSummaryAndTags({
    ...fragment,
    rawTextOptional: sourceText || fragment.rawTextOptional,
  });

  try {
    const [structured, embedding] = await Promise.all([
      createSummaryAndTags(sourceText),
      createEmbeddingVector(sourceText),
    ]);

    return {
      summary: structured?.summary || heuristic.summary,
      tags: structured?.tags?.length ? structured.tags : heuristic.tags,
      embedding:
        embedding ??
        heuristic.embeddingKeywords.map((keyword, index) => keyword.length + index),
      embeddingKeywords: heuristic.embeddingKeywords,
      provider: embedding || structured ? 'openai' : 'heuristic',
      model: embedding || structured ? 'provider-backed' : 'heuristic',
    };
  } catch {
    return {
      summary: heuristic.summary,
      tags: heuristic.tags,
      embedding: heuristic.embeddingKeywords.map(
        (keyword, index) => keyword.length + index,
      ),
      embeddingKeywords: heuristic.embeddingKeywords,
      provider: 'heuristic',
      model: 'heuristic',
    };
  }
}
