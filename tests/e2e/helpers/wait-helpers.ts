export async function waitFor<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  { timeoutMs = 30_000, intervalMs = 500, label = 'condition' } = {},
): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await fn();
    if (predicate(value)) return value;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timed out waiting for ${label} after ${timeoutMs}ms`);
}
