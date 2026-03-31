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
    <div className="flex gap-2 mt-3">
      <button className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 transition-colors" onClick={() => void onConfirm()} type="button">
        确认
      </button>
      <button className="rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 transition-colors" onClick={() => void onDismiss()} type="button">
        忽略
      </button>
      <button className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors" onClick={() => void onPostpone()} type="button">
        稍后
      </button>
    </div>
  );
}
