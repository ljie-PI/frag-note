export function shouldRetry(status: string, attemptCount: number) {
  return status === 'failed' && attemptCount < 3;
}
