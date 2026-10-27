/**
 * Bounded retry-with-backoff for provider GET reads. A single transient upstream
 * blip (HTTP 429 rate-limit or a 5xx) would otherwise become a user-facing 502 —
 * the adapters surface any non-ok as a `ProviderError`. Retrying a *read* a small
 * number of times with exponential backoff (honoring `Retry-After` when the
 * provider sends it) smooths over those blips without masking a real outage.
 *
 * Only idempotent GETs are wrapped (search / lookup / playlist). Token mints and
 * the per-user likes path keep their own logic. The `sleep` seam is injectable so
 * the behavior is unit-tested without real timers.
 */
import { abortError, isQuotaExceededBody } from './errors.js';
import type { FetchLike, ProviderAbortSignal } from './provider.js';

// Available in the Workers runtime and Node (vitest). Declared here so the package
// needs no DOM/Workers ambient lib (same pattern as `btoa` in app-token.ts).
declare const setTimeout: (handler: () => void, timeout?: number) => unknown;

export interface RetryOptions {
  /** Extra attempts after the first (default 2 → up to 3 total fetches). */
  maxRetries?: number;
  /** First backoff step in ms; doubles each retry (default 200). */
  baseDelayMs?: number;
  /** Cap on a single backoff wait, in ms (default 2000). */
  maxDelayMs?: number;
  /**
   * Longest `Retry-After` worth waiting for inside one Worker request, in ms
   * (default 5000). A longer one returns the response at once rather than
   * stalling the request or retrying early into the same limit.
   */
  maxRetryAfterMs?: number;
  /** Sleep seam — tests pass a no-op/spy. Defaults to a real `setTimeout`. */
  sleep?: (ms: number) => Promise<void>;
  /** Clock seam for `Retry-After` HTTP-date math (defaults to `Date.now`). */
  now?: () => number;
  /** Preview abort. Checked before each attempt and instead of sleeping past it. */
  signal?: ProviderAbortSignal;
  /** Absolute ms deadline. A retry sleep that would pass it aborts instead. */
  deadlineAt?: number;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function throwIfAborted(signal?: ProviderAbortSignal, deadlineAt?: number, now?: number): void {
  if (signal?.aborted) throw abortError();
  if (deadlineAt != null && now != null && now >= deadlineAt) throw abortError();
}

/** Sleep, but reject immediately when the preview signal aborts. */
async function sleepOrAbort(
  sleep: (ms: number) => Promise<void>,
  ms: number,
  signal?: ProviderAbortSignal,
): Promise<void> {
  if (!signal) {
    await sleep(ms);
    return;
  }
  if (signal.aborted) throw abortError();
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', onAbort);
      fn();
    };
    const onAbort = () => finish(() => reject(abortError()));
    signal.addEventListener('abort', onAbort);
    void Promise.resolve(sleep(ms)).then(
      () => finish(resolve),
      (err: unknown) => finish(() => reject(err)),
    );
  });
}

/** 429 (rate limited) and 5xx (upstream) are transient and safe to retry for a GET. */
export function isTransientStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

/**
 * Parse a `Retry-After` header into ms. The value is either delta-seconds
 * (`"120"`) or an HTTP date; returns null when absent or unparseable, and never a
 * negative wait.
 */
export function parseRetryAfterMs(
  value: string | null | undefined,
  now: number = Date.now(),
): number | null {
  if (value == null || value === '') return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const dateMs = Date.parse(value);
  return Number.isNaN(dateMs) ? null : Math.max(0, dateMs - now);
}

type FetchResponse = Awaited<ReturnType<FetchLike>>;

/** The same response with its body already read, so the caller can read it again. */
function withBufferedBody(res: FetchResponse, body: string): FetchResponse {
  return {
    ok: res.ok,
    status: res.status,
    ...(res.headers ? { headers: res.headers } : {}),
    text: async () => body,
    json: async () => JSON.parse(body) as unknown,
  };
}

/**
 * Fetch `input`, retrying on a transient status with exponential backoff. Returns
 * the final response (ok, non-transient, or attempts exhausted) for the caller to
 * map as it would a single fetch — this never throws on its own.
 *
 * Not retried: a 429 whose body says `QUOTA_EXCEEDED` (the quota will not refill
 * within this request), and a `Retry-After` longer than `maxRetryAfterMs`.
 */
export async function fetchWithRetry(
  fetchImpl: FetchLike,
  input: string,
  init?: Parameters<FetchLike>[1],
  opts: RetryOptions = {},
): Promise<FetchResponse> {
  const maxRetries = opts.maxRetries ?? 2;
  const baseDelayMs = opts.baseDelayMs ?? 200;
  const maxDelayMs = opts.maxDelayMs ?? 2000;
  const maxRetryAfterMs = opts.maxRetryAfterMs ?? 5000;
  const sleep = opts.sleep ?? defaultSleep;
  const now = opts.now ?? (() => Date.now());

  let attempt = 0;
  for (;;) {
    const clock = now();
    throwIfAborted(opts.signal, opts.deadlineAt, clock);
    let res = await fetchImpl(input, init);
    if (res.ok || !isTransientStatus(res.status)) return res;
    if (res.status === 429) {
      const body = await res.text().catch(() => '');
      res = withBufferedBody(res, body);
      if (isQuotaExceededBody(body)) return res;
    }
    if (attempt >= maxRetries) return res;
    const headerMs = parseRetryAfterMs(res.headers?.get('retry-after'), now());
    if (headerMs != null && headerMs > maxRetryAfterMs) return res;
    const backoffMs = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
    const wait = headerMs ?? backoffMs;
    const after = now();
    if (opts.deadlineAt != null && after + wait > opts.deadlineAt) throw abortError();
    throwIfAborted(opts.signal, opts.deadlineAt, after);
    await sleepOrAbort(sleep, wait, opts.signal);
    attempt += 1;
  }
}
