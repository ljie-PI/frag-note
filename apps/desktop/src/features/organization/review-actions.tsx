export function ReviewActions({
  onConfirm,
  onDismiss,
  onPostpone,
}: {
  onConfirm: () => Promise<void> | void;
  onDismiss: () => Promise<void> | void;
  onPostpone: () => Promise<void> | void;
}) {
  return (
    <div>
      <button onClick={() => void onConfirm()} type="button">
        Confirm
      </button>
      <button onClick={() => void onDismiss()} type="button">
        Dismiss
      </button>
      <button onClick={() => void onPostpone()} type="button">
        Postpone
      </button>
    </div>
  );
}
