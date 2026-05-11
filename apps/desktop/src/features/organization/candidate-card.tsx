import type { DerivedObject } from '@frag-note/domain';
import { ReviewActions } from './review-actions.tsx';

export function CandidateCard({
  candidate,
  supportingFragmentCount,
  onConfirm,
  onDismiss,
  onPostpone,
}: {
  candidate: DerivedObject;
  supportingFragmentCount?: number;
  onConfirm: () => Promise<void> | void;
  onDismiss: () => Promise<void> | void;
  onPostpone: () => Promise<void> | void;
}) {
  return (
    <article>
      <h3 className="text-sm font-semibold text-slate-900">{candidate.title}</h3>
      <p className="text-sm text-slate-600 mt-1">{candidate.summary}</p>
      <p className="text-xs text-slate-400 mt-1">关联碎片：{supportingFragmentCount ?? candidate.citations.length}</p>
      <ReviewActions
        onConfirm={onConfirm}
        onDismiss={onDismiss}
        onPostpone={onPostpone}
      />
    </article>
  );
}
