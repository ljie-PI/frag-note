import type { DerivedObject } from '@sui-note/domain';
import { UpdateSuggestionPanel } from '../../features/organization/update-suggestion-panel.tsx';

export function DerivedObjectDetailPage({
  candidate,
}: {
  candidate: DerivedObject | null;
}) {
  if (!candidate) {
    return (
      <section>
        <h3>Derived Object Detail</h3>
        <p>Select an organization candidate to inspect supporting evidence.</p>
      </section>
    );
  }

  return (
    <section>
      <h3>{candidate.title}</h3>
      <p>Status: {candidate.status}</p>
      <p>{candidate.summary}</p>
      <ul>
        {candidate.supportingFragmentIds.map((fragmentId) => (
          <li key={fragmentId}>{fragmentId}</li>
        ))}
      </ul>
      <UpdateSuggestionPanel candidate={candidate} />
    </section>
  );
}
