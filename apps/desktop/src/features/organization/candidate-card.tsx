import type { DerivedObject } from '@sui-note/domain';
import { ReviewActions } from './review-actions.tsx';

export function CandidateCard({
  candidate,
  onConfirm,
  onDismiss,
  onPostpone,
}: {
  candidate: DerivedObject;
  onConfirm: () => Promise<void> | void;
  onDismiss: () => Promise<void> | void;
  onPostpone: () => Promise<void> | void;
}) {
  return (
    <article>
      <h3>{candidate.title}</h3>
      <p>{candidate.summary}</p>
      <p>Supporting fragments: {candidate.supportingFragmentIds.length}</p>
      <ReviewActions
        onConfirm={onConfirm}
        onDismiss={onDismiss}
        onPostpone={onPostpone}
      />
    </article>
  );
}
