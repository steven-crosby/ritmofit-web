# Performance

> **Follow the house rules first:**
> `agent-prompts/00-house-rules.md`
> Measure before and after — never "optimize" on vibes. Put the numbers in the PR.

**REPO:** `ritmofit-web`

**Use when:** there is suspected slowness in the SPA, Worker, D1 access, caching, bundles, fonts,
or Core Web Vitals.
**Do not use when:** correctness or crash risk is the primary issue; use `stability.md` first.

- Core Web Vitals (LCP / INP / CLS); render-blocking resources; oversized / unsplit
  bundles; unoptimized images and fonts (the design fonts are heavy — check loading
  strategy).
- Worker cold-start cost; oversized dependencies pulled into the Worker.
- D1: N+1 query patterns, missing indexes, `SELECT *` on hot paths, unbatched writes.
- Caching: missing `Cache-Control` / KV / edge-cache opportunities on hot reads.

Each PR: one bottleneck, with a before/after measurement. Big rewrites → report, don't ship.
(Pairs with your `web-perf` skill for the front-end measurements.)
