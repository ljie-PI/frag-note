import type { Fragment } from '@sui-note/domain';

export function transcribeVoice(fragment: Fragment): { text: string } {
  return {
    text: fragment.rawTextOptional?.trim() || 'Voice transcript unavailable',
  };
}
