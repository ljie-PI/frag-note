export function RetryButton({
  onRetry,
}: {
  onRetry: () => Promise<void> | void;
}) {
  return (
    <button
      onClick={() => {
        void onRetry();
      }}
      type="button"
    >
      Retry
    </button>
  );
}
