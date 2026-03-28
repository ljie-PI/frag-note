import type { LocalFragmentRecord } from '../../features/capture/capture-store.ts';

export function FragmentDetailPage({
  record,
}: {
  record: LocalFragmentRecord | null;
}) {
  if (!record) {
    return (
      <section>
        <h3>Fragment Detail</h3>
        <p>Select a fragment to inspect raw and derived data.</p>
      </section>
    );
  }

  return (
    <section>
      <h3>Fragment Detail</h3>
      <div>Raw Content</div>
      <p>{record.fragment.rawTextOptional ?? 'No raw text'}</p>
      <div>Derived Artifacts</div>
      <ul>
        {record.derivedArtifacts.map((artifact) => (
          <li key={artifact.artifactId}>{artifact.artifactType}</li>
        ))}
      </ul>
      <div>Related Fragments</div>
      <ul>
        {record.relatedFragments.map((relation) => (
          <li key={relation.relationId}>{relation.explanation}</li>
        ))}
      </ul>
    </section>
  );
}
