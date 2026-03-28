import type { DerivedObject, Fragment } from '@sui-note/domain';

export type UpdateSuggestion = {
  objectId: string;
  suggestedSummary: string;
  suggestedSupportingFragmentIds: string[];
};

export function buildUpdateSuggestions(
  object: DerivedObject,
  fragments: Fragment[],
): UpdateSuggestion[] {
  const unseen = fragments.filter(
    (fragment) => !object.supportingFragmentIds.includes(fragment.fragmentId),
  );

  if (unseen.length === 0) {
    return [];
  }

  return [
    {
      objectId: object.objectId,
      suggestedSummary: `${object.summary} Updated with ${unseen.length} new supporting fragments.`,
      suggestedSupportingFragmentIds: unseen.map((fragment) => fragment.fragmentId),
    },
  ];
}
