import type { DerivedObject } from '@sui-note/domain';

export function UpdateSuggestionPanel({
  candidate,
}: {
  candidate: DerivedObject | null;
}) {
  if (!candidate) {
    return null;
  }

  return (
    <section>
      <h4>Update Suggestions</h4>
      <p>{candidate.summary}</p>
      <p>Rule version: {candidate.ruleVersion}</p>
    </section>
  );
}
