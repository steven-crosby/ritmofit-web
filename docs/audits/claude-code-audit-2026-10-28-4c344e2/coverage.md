# Coverage — ritmofit-web @ 4c344e2

Depth: **traced** means read end to end with its callers. **Tested** means traced plus an executed
check or repro. **Sampled** means read selectively. **Not assessed** means not looked at. Per-file
detail is in each lane file's §1.

| Subsystem / workflow | Depth | Reviewer | Evidence | Remaining gaps |
| --- | --- | --- | --- | --- |
| Worker request path (`index.ts`): headers, nested-id 404, `onError`, mount order, `scheduled` | traced + tested | lane A, D2 | AUD-011, AUD-016; mount order holds | `scheduled` has no test (gap, not defect) |
| Better Auth 1.7.14 config, beta allowlist, reset and verify, cookies | traced + tested | lane A, chal-2, chal-3 | AUD-003, AUD-013; prior A-8 still reproduces | iOS session-cookie refresh (hypothesis) |
| Authz: `requireAccess` and child helpers, all 83 handlers, body foreign ids | traced (gate table) | lane A | no missing gate | concurrency family A-10 not re-run |
| D1 queries: batches, ordering, pagination, 100-param limit | traced + tested | lane A, D2 | AUD-012 | 1000-queries/invocation on huge copies not measured |
| Schema: Drizzle vs migrations vs `schema.md` | tested (drizzle-kit) | lane A | no drift | latent rebuild A-7 not re-run |
| OpenAPI registry vs routes and DTOs; contract parity | tested | lane A, gate | AUD-017; parity green | — |
| Run payload (`run-payload.ts`) and iOS DTO | traced + tested | lane A | AUD-011 trigger, AUD-014 | — |
| Dormant shares, teams and explore (security only) | traced + tested | lane A | AUD-015; A-1..A-4 still reproduce | — |
| Rate limiting, purge drain, rate-limit prune | traced | lane A, C, D2 | sound (D-1 known) | — |
| Provider clients (`packages/music`), OAuth/PKCE, token crypto | traced | lane C | rejected leads | real provider behaviour not testable here |
| Server music wiring (registry, import, likes, playlists, playback token, BPM) | traced + tested | lane C | AUD-010 | SoundCloud refresh-token reuse semantics |
| Client playback (coordinator, runtime, adapters, liveness, preview) | traced + tested | lane C, chal-1 | AUD-001 | audible behaviour, real start latency |
| MusicKit FairPlay probe (#634/#636) | tested (jsdom + real Chromium) | lane C, lead | AUD-002 | WebKit and iPhone not run |
| Music constraints (no caching, proxying or analysis; no Spotify BPM) | sampled (repo grep) | lane C | hold | — |
| Web: Music tab browse and import, likes, saved playlists | traced + tested | lane B | AUD-005, AUD-008 | — |
| Web: Classes home, builder, reorder, inspector | traced (sampled) + tested | lane B | AUD-007; B-1..B-4 known | — |
| Web: readiness vs Live gates | traced | lane B | consistent | — |
| Web: Live clock, sections, end of class, session loss, OAuth return | traced | lane B, chal-1 | AUD-006, AUD-009 | tab discard and Back on device |
| Web: `lib/api.ts` client | traced | lane B | sound (no timeouts — lead only) | — |
| Web: effects, timers, listeners | grep-complete + traced | lane B | all cleaned up | — |
| PWA: UpdatePrompt, lazyWithReload, SW `/api/` denylist, CSP vs Worker headers | traced | lane B | sound | open-tab update across deploy (RF-87) |
| Accessibility (functional failures only) | sampled | lane B | nothing new (RF-73 known) | full AT pass not done |
| CI tooling: owner-gate, rf-trace, tasks.mjs | tested (crafted inputs) | lane D1, chal-2 | AUD-018, AUD-019 | mutation score of self-tests |
| `deploy.sh` and its self-check | tested (mutants, sandbox) | lane D1, chal-2 | AUD-004, AUD-020 | post-resolution deploy path traced only |
| `.github/workflows/ci.yml` | traced | lane D1 | no defect beyond RF-100..105 | not executed on GitHub (this PR's CI ran) |
| Test realism, census, vacuous tests, fixtures | tested | lane D2 | D-7 still the only crash | — |
| Typecheck and lint coverage | tested | lane D2 | D-6 (59), D-9 (no current bug) | — |
| Dependencies and audit ignores | tested | lane D2 | AUD-021 | — |
| Bundle budget | tested (rebuild) | lane D2, gate | 174.08 / 180 kB | — |
| Logging and observability | traced + tested | lane D2, chal-3 | AUD-003 | production log contents not checked |
| Deferred community UI (Explore, Teams, Share) | not assessed (UI) | — | deferred by AGENTS.md | — |
| iOS app (`ritmofit-ios`) | not assessed | — | out of repo | — |
| Production, remote D1, real devices | not assessed | — | not authorized | — |
