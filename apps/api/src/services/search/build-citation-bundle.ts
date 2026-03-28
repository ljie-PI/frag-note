import type { Citation, DerivedObject, Fragment } from '@sui-note/domain';

export function buildCitationBundle(input: {
  fragments: Fragment[];
  derivedObjectExpansion: DerivedObject[];
}): Citation[] {
  const direct = input.fragments.slice(0, 3).map((fragment) => ({
    fragmentId: fragment.fragmentId,
    locator: {
      kind: 'text_span' as const,
      value: '0:42',
    },
    supportPath: 'direct' as const,
  }));

  const expanded = input.derivedObjectExpansion.flatMap((candidate) =>
    candidate.citations.map((citation) => ({
      ...citation,
      supportPath: 'derived_object_expansion' as const,
    })),
  );

  const seen = new Set<string>();
  const citations: Citation[] = [];

  for (const citation of [...direct, ...expanded]) {
    const key = `${citation.fragmentId}:${citation.locator.kind}:${citation.locator.value}:${citation.supportPath}`;
    if (seen.has(key)) continue;
    seen.add(key);
    citations.push(citation);
  }

  return citations;
}
