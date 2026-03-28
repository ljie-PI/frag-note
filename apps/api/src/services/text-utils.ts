export function tokenizeText(...values: Array<string | null | undefined>): string[] {
  const text = values.filter(Boolean).join(' ');
  return [
    ...new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)),
    ),
  ];
}

export function summarizeText(
  text: string,
  titleOptional?: string | null,
): string {
  if (text.length > 0) {
    return text.length <= 120 ? text : `${text.slice(0, 117)}...`;
  }

  return titleOptional ? `Captured fragment for ${titleOptional}` : 'Captured fragment';
}

const STOP_WORDS = new Set([
  'about',
  'and',
  'for',
  'from',
  'into',
  'later',
  'note',
  'notes',
  'that',
  'the',
  'this',
  'with',
]);
