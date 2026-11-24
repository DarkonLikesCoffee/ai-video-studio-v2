export type CommonsVideoCandidate = {
  id: string; title: string; source: "Wikimedia Commons"; sourcePage: string | null;
  url: string | null; thumbnail: string | null; mime: string; filetype: string | null;
  width: number | null; height: number | null; bytes: number | null; license: string;
  licenseUrl: string | null; creator: string; attribution: string | null; allowed: boolean;
};
export function buildCommonsVideoSearchUrl(query: string, limit?: number): URL;
export function normalizeCommonsVideo(page: Record<string, unknown>): CommonsVideoCandidate;
export function buildStoryboardVideoQueries(plan: { shots: Array<Record<string, unknown>> }, maxShots?: number): Array<{ shotId: string; query: string }>;
export function runCli(argv?: string[]): Promise<void>;

export function getHttpRetryDelayMs(retryAfter: string | null | undefined, attempt: number, now?: number): number;
export function fetchWithRetries(
  url: string | URL,
  options?: RequestInit,
  fetchImpl?: typeof fetch,
  pause?: (milliseconds: number) => Promise<void>,
): Promise<Response>;
