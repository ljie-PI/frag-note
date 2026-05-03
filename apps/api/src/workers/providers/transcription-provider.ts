import type { Fragment } from '@frag-note/domain';
import { transcribeAudioBytes } from '../../lib/openai-client.js';
import type { FragmentAssetPointer } from '../../services/fragment-content.js';

export function transcribeVoice(fragment: Fragment): { text: string } {
  return {
    text: fragment.rawTextOptional?.trim() || 'Voice transcript unavailable',
  };
}

export async function transcribeVoiceAsset(
  fragment: Fragment,
  asset:
    | (FragmentAssetPointer & {
        bytes?: Uint8Array;
      })
    | null,
): Promise<{ text: string; provider: string; model: string }> {
  const fallback = transcribeVoice(fragment);

  if (!asset?.bytes || asset.bytes.length === 0) {
    return {
      text: fallback.text,
      provider: 'heuristic',
      model: 'heuristic',
    };
  }

  try {
    const transcript = await transcribeAudioBytes(
      asset.bytes,
      asset.fileName,
      asset.mimeType,
    );

    return {
      text: transcript || fallback.text,
      provider: transcript ? 'openai' : 'heuristic',
      model: transcript ? 'transcription' : 'heuristic',
    };
  } catch {
    return {
      text: fallback.text,
      provider: 'heuristic',
      model: 'heuristic',
    };
  }
}
