import type { Fragment } from '@sui-note/domain';
import { summarizeText, tokenizeText } from '../../services/text-utils.js';

export function generateSummaryAndTags(fragment: Fragment) {
  const sourceText = [
    fragment.titleOptional,
    fragment.rawTextOptional,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .trim();
  const keywords = tokenizeText(sourceText);

  return {
    summary: summarizeText(sourceText, fragment.titleOptional),
    tags: keywords.slice(0, 5),
    embeddingKeywords: keywords,
  };
}
