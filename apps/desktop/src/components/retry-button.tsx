export function RetryButton({
  onRetry,
}: {
  onRetry: () => Promise<void> | void;
}) {
  return (
    <button
      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
      onClick={() => {
        void onRetry();
      }}
      type="button"
    >
      重试
    </button>
  );
}
