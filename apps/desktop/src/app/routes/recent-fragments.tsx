import type { LocalFragmentRecord } from '../../features/capture/capture-store.ts';
import { RetryButton } from '../../components/retry-button.tsx';
import { StatusBadge } from '../../components/status-badge.tsx';

export function RecentFragmentsPage({
  records,
  onSelect,
  onRetry,
}: {
  records: LocalFragmentRecord[];
  onSelect?: (record: LocalFragmentRecord) => void;
  onRetry?: (record: LocalFragmentRecord) => Promise<void>;
}) {
  return (
    <section>
      <h2>Recent Fragments</h2>
      <ul>
        {records.map((record) => (
          <li key={record.fragment.fragmentId}>
            <strong>{record.fragment.titleOptional ?? 'Untitled fragment'}</strong>
            <div>
              Status: <StatusBadge status={record.fragment.status} />
            </div>
            <div>Raw: {record.fragment.rawTextOptional ?? 'No raw text'}</div>
            {record.derivedArtifacts.length > 0 ? (
              <div>
                Derived: {record.derivedArtifacts.map((artifact) => artifact.artifactType).join(', ')}
              </div>
            ) : null}
            {onSelect ? (
              <button onClick={() => onSelect(record)} type="button">
                View Detail
              </button>
            ) : null}
            {record.fragment.status === 'failed' && onRetry ? (
              <RetryButton onRetry={() => onRetry(record)} />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
