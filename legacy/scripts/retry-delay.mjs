/**
 * Shared Retry-After parsing and bounded exponential-backoff calculation.
 * Callers provide their own provider-specific delay limits and retry policy.
 */
export const calculateRetryDelayMs = (
  retryAfter,
  attempt,
  {
    minRetryAfterMs = 1_000,
    maxRetryAfterMs = 60_000,
    baseDelayMs = 1_000,
    maxBackoffMs = 15_000,
  } = {},
  now = Date.now(),
) => {
  const header = String(retryAfter ?? "").trim();
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.max(minRetryAfterMs, Math.min(maxRetryAfterMs, seconds * 1_000));
    }
    const date = Date.parse(header);
    if (Number.isFinite(date)) {
      return Math.max(minRetryAfterMs, Math.min(maxRetryAfterMs, date - now));
    }
  }
  return Math.min(maxBackoffMs, baseDelayMs * (2 ** Math.max(0, attempt)));
};
