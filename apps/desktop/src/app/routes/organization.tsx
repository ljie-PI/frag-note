import type { DerivedObject } from '@sui-note/domain';
import { CandidateCard } from '../../features/organization/candidate-card.tsx';

export function OrganizationPage({
  candidates,
  onSelect,
  onConfirm,
  onDismiss,
  onPostpone,
}: {
  candidates: DerivedObject[];
  onSelect?: (candidate: DerivedObject) => void;
  onConfirm?: (candidate: DerivedObject) => Promise<void>;
  onDismiss?: (candidate: DerivedObject) => Promise<void>;
  onPostpone?: (candidate: DerivedObject) => Promise<void>;
}) {
  return (
    <section>
      <h2>Organization</h2>
      <div>
        {candidates.map((candidate) => (
          <div key={candidate.objectId}>
            <CandidateCard
              candidate={candidate}
              onConfirm={() => onConfirm?.(candidate)}
              onDismiss={() => onDismiss?.(candidate)}
              onPostpone={() => onPostpone?.(candidate)}
            />
            {onSelect ? (
              <button onClick={() => onSelect(candidate)} type="button">
                View Candidate Detail
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
