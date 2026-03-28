import type { Fragment } from '@sui-note/domain';

export function runOcr(fragment: Fragment): { text: string } {
  return {
    text:
      fragment.rawTextOptional?.trim() ||
      `${fragment.sourceType.toUpperCase()} OCR extracted text`,
  };
}
