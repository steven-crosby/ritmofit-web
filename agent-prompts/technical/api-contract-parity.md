# API contract & cross-platform parity (from the web/backend side)

> **Follow the house rules first:**
> `agent-prompts/00-house-rules.md`
> This one reads the vendored [`ios-snapshot/`](../../ios-snapshot/) (a read-only copy of the
> iOS client source) for context — no sibling iOS checkout required; you branch only here in
> `ritmofit-web`. It catches the classic companion-app bug: the iOS client and this backend
> drifting apart. Because this repo is the source of truth, most genuine
> drift fixes are a backend contract decision → **report**, not an unattended change.

**Use when:** backend routes, OpenAPI, shared schemas, auth/session expectations, or iOS Swift
decoding may have drifted.
**Do not use when:** the question is only user-facing copy parity; use
`content-consistency.md` instead.

You serve the API (Workers + D1) and own `apps/api/openapi/openapi.json`. Compare what this
backend actually serves against what the iOS client decodes (vendored in `ios-snapshot/`):

- **Endpoint drift:** routes / methods the iOS client calls that this backend no longer
  serves; changed paths.
- **Payload shape & nullability:** fields the client decodes that the server may omit or
  null (recall the prod run-payload nullability bug); type mismatches; enum / string
  drift (e.g. Intensity / Tempo / rhythm-signature values). The server is authoritative —
  an accidental nullability/enum change here is a client-crashing regression.
- **Auth contract:** token/session expectations match on both sides. Email/password and
  Apple bundle-ID support are implemented; verify the contract the iOS client relies on
  stays aligned, and separately report whether Apple secrets and device-level end-to-end
  verification are still outstanding. Do not imply the iOS client uses a provider the
  current source doesn't implement.
- **Feature parity:** backend capabilities the iOS client can't yet reach, or stale
  endpoints no client uses.

Output: a parity report, drifts ranked by user-facing risk. From this repo, open a PR only
for a safe, isolated, behaviour-preserving backend fix (e.g. restoring a field the contract
documents as non-null that a recent change accidentally made nullable). Any deliberate
contract change → report with a recommendation; never reshape the wire contract unattended.

**Post-schema-change sync (when this backend's contract just moved):** if the inspected work
touched the API or DB schema, the regenerate-and-reconcile flow is:
1. `pnpm --filter @ritmofit/api openapi` to regenerate `apps/api/openapi/openapi.json`,
   then read the diff to see exactly what changed.
2. The matching Swift types in the iOS client (`ios-snapshot/Core/Models`,
   `ios-snapshot/Core/Networking`) must be updated to the regenerated contract — that
   reconcile is the **iOS** repo's job; from here, report the exact diff and which client
   types it affects so that work can be picked up there. (The snapshot is read-only and can
   lag iOS; see `ios-snapshot/README.md`.)
3. Verify on this side: `pnpm -r typecheck`. A regen that produces an unexpected diff, or a
   contract change needing a product decision, is report-only.
