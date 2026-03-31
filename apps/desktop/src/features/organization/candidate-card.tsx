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
      <h3 className="text-sm font-semibold text-slate-900">{candidate.title}</h3>
      <p className="text-sm text-slate-600 mt-1">{candidate.summary}</p>
      <p className="text-xs text-slate-400 mt-1">关联碎片：{candidate.supportingFragmentIds.length}</p>
      <ReviewActions
        onConfirm={onConfirm}
        onDismiss={onDismiss}
        onPostpone={onPostpone}
      />
    </article>
  );
}
