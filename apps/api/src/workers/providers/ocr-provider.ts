import type { Fragment } from '@frag-note/domain';
import { extractTextFromVisualAsset } from '../../lib/openai-client.js';
import type { FragmentAssetPointer } from '../../services/fragment-content.js';

export function runOcr(fragment: Fragment): { text: string } {
  return {
    text:
      fragment.rawTextOptional?.trim() ||
      `${fragment.sourceType.toUpperCase()} OCR extracted text`,
  };
}

export async function runOcrForAsset(
  fragment: Fragment,
  asset:
    | (FragmentAssetPointer & {
        bytes?: Uint8Array;
      })
    | null,
): Promise<{ text: string; provider: string; model: string }> {
  const fallback = runOcr(fragment);

  if (!asset?.bytes || asset.bytes.length === 0) {
    return {
      text: fallback.text,
      provider: 'heuristic',
      model: 'heuristic',
    };
  }

  try {
    const extracted = await extractTextFromVisualAsset(
      asset.bytes,
      asset.mimeType,
      asset.fileName,
    );

    return {
      text: extracted || fallback.text,
      provider: extracted ? 'openai' : 'heuristic',
      model: extracted ? 'vision' : 'heuristic',
    };
  } catch {
    return {
      text: fallback.text,
      provider: 'heuristic',
      model: 'heuristic',
    };
  }
}
