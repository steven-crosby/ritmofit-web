/**
 * The platform `fetch`, wrapped so it can be passed **by reference** into the
 * music adapters (as their injectable `fetchImpl`) without losing its `this`.
 *
 * Passing the bare global `fetch` works under miniflare (local dev) but throws
 * `TypeError: Illegal invocation` in the production Workers runtime, because the
 * adapter calls it detached from `globalThis`. Forwarding through an arrow keeps
 * the call bound to the global. Always pass `boundFetch`, never `fetch`, to an
 * adapter. See https://developers.cloudflare.com/workers/observability/errors/#illegal-invocation-errors
 */
export const boundFetch: typeof fetch = (input, init) => fetch(input, init);
