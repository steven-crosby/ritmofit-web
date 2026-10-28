# Challenge 3: Q-01 (D1 failures write secrets and PII to the Worker log)

- **Challenger:** Claude Code, independent skeptical pass, 2026-10-28, commit `4c344e2`.
- **Worktree:** `/tmp/claude-0/-home-user-ritmofit-web/225314d5-8442-5f3f-bf78-85de30171bbc/scratchpad/wt-chal3`
  (detached at `4c344e2`, `pnpm install --frozen-lockfile`). I edited no tracked files in the main checkout and made no commits.
- **Verdict: Upheld, with qualifications.** The mechanism is real and the repro is a faithful model.
  **P3 stays.** It does not reach P2. Two corrections: (a) for reset tokens, the extra exposure is
  smaller than the write-up implies, because the token already reaches Workers Logs on every reset as
  part of the request URL; (b) the proposed fix is incomplete, because better-call logs the error a
  second time and the Better Auth `logger` / `onAPIError.onError` options do not reach that log.

## What I re-ran

| Run | Result |
| --- | --- |
| Lane repro `test/d2-quality-q01-reset-token-log.integration.test.ts` (integration config) | 1/1 pass. `reset status=500 logLines=2 tokenInLog=true`. Same two lines as the lane evidence: `ERROR [Better Auth]: Error Failed query: … params: reset-password:<TOKEN>,1` and `# SERVER_ERROR:  Failed query: … params: reset-password:<TOKEN>,1` |
| Lane repro `src/lib/d2-quality-q01-drizzle-error-params.test.ts` | 2/2 pass |
| My variant `test/chal3-q01.integration.test.ts` (scratch only), console spies keep the raw args | `read-fail status=500 errArgs=2 stackLeak=true props=["query,params,cause",…] name=Error`, then `retry status=200` with the **same token**, so the token stays valid after the failed call. A failure injected on the `delete from "verifications"` step hit the `expires_at < ?` cleanup first: 500, params were only a timestamp, no secret leaked |
| Node check: a `DrizzleQueryError`-shaped error built the way 0.45.2 builds it | `.stack` contains the params (`true`) and the name is the plain `Error` |

## Answers to the six questions

1. **Are params in `error.message`? Yes, in the message itself, not just in a property.** In the
   installed `drizzle-orm@0.45.2`, `errors.js:10-19` does `super(\`Failed query: ${query}\nparams: ${params}\`)`
   and also sets `.params` and `.cause`. Every D1 call (`d1/session.js:119,128,152,180`) goes through
   `queryWithCache` (`sqlite-core/session.js:38-63`), which wraps every throw. Because
   `captureStackTrace` runs after `super`, `.stack` contains the params too. So `console.error(err)`,
   `${err.message}` and stack serialization all leak. The only safe fields are `.cause.message` and
   the plain-`Error` name.
2. **Does Better Auth log it at the default level? Yes.** `@better-auth/core/dist/env/logger.mjs`
   `createLogger` defaults to `level: "warn"`, and at error level it calls
   `console.error(formattedMessage, ...args)`, which includes the error object. `apps/api/src/lib/auth.ts`
   sets no `logger`, no `onAPIError`, no `verification` block and no plugins. `router.onError`
   (`better-auth/dist/api/index.mjs:196-219`) takes `ctx.logger?.error(e.name, e)`. If the message
   contains "column", "table" or "relation", it takes `ctx.logger?.error(e.message)` instead, which
   still leaks. **Addition:** `better-call/dist/router.mjs:83-93` then runs
   `console.error('# SERVER_ERROR: ', error)` unconditionally, because Better Auth's `onError` returns
   no Response. Silencing the Better Auth logger, or setting `onAPIError.onError`, therefore leaves
   this second line in place. Only `onAPIError: { throw: true }` avoids it: the inner catch rethrows
   the error, it reaches Hono's `app.onError` (`index.ts:118`), and that handler must then be
   sanitized.
3. **Are the triggers plausible? Yes, but rare.** Cloudflare documents transient D1 errors that
   clients are told to retry: "Network connection lost", "storage caused object to be reset",
   "D1 DB is overloaded", internal error and timeout. They occur in production, but at low rates. For a
   low-traffic solo app, a reset POST or OAuth upsert landing on one is unlikely, though it will
   happen over time. The non-transient path is real and live: Q-02's "too many SQL variables" logs
   101 class ids. Those are not secrets, but they show the same plumbing fires in production code
   paths. Statements that bind secrets bind only a few params, so they will not hit the variable limit.
4. **Is the reset token stored plaintext, and is it still valid afterwards? Yes and yes.**
   `password.mjs:77` stores `identifier: reset-password:<token>` (`storeIdentifier` is unset;
   `internal-adapter.mjs:717ff` supports `'hashed'`). The logged param is that identifier, which
   contains the raw token. A failed read consumes nothing, and my retry with the same token returned
   200. So the token stays usable until the user retries successfully or it expires (1 h).
   **Counterevidence on incremental impact:** the reset email link is
   `/api/auth/reset-password/<token>?callbackURL=…` (`password.mjs:81`), and that request is served by
   the Worker (`run_worker_first = ["/api/*"]`). With `[observability] enabled = true`
   (`wrangler.toml:54-55`), Workers Logs invocation logs record the request URL by default (per
   Cloudflare docs; I did not check a live deployment). So **every** reset token already reaches the
   same log store, with the same readers and the same retention, and stays live for the
   minutes before the user submits. Q-01 adds a token that stays live a bit longer, not a new class
   of exposure. Hashing identifiers fixes the DB-param leak but not the URL leak.
5. **Are provider tokens encrypted? Yes, the logged params are ciphertext.** `provider-connections.ts`
   writes `encryptSecret(tokens.accessToken, key)` before `upsertConnection`, and the key is a Worker
   secret that is never logged. Low impact on its own. Still, it contradicts the comment at `:332-333`
   ("no tokens/codes/secrets"). Session-token lookups log the raw session token, but cookies are
   HMAC-signed and no bearer plugin is enabled (`auth.ts` has no `plugins`), so the logged value is
   not replayable without `BETTER_AUTH_SECRET`. The remaining real-world impact is **PII**: emails
   from sign-up, sign-in and share lookups, and password hashes from sign-up inserts and credential
   updates.
6. **Severity: P3, not P2.** Only Cloudflare account members can read Workers Logs. On this solo
   project that is the owner, who already holds every secret. No Logpush or tail consumer is
   configured (`wrangler.toml` has neither). The trigger is a rare transient failure. For reset
   tokens the leak is mostly redundant with URL logging. It stays a finding, not a rejection: it
   breaks the non-negotiable "Never log tokens…" rule, it contradicts two in-code claims, and it puts
   emails and password hashes into retained logs. P2 would only apply if logs leave the account
   (Logpush, a shared dashboard, extra account members).

## Is the repro a faithful model?

Yes. The Proxy replaces the D1 binding's statement with one whose `all`, `raw`, `first` and `run`
reject with an `Error('D1_ERROR: …')`. The real binding behaves the same way: it rejects with a plain
`Error`, and Drizzle wraps it identically in either case. The wrapping happens in `queryWithCache`,
upstream of the binding. One weakness: the lane's capture formatter turns each Error into
`message + cause` instead of passing on what workerd would print. My variant kept the raw args and
confirmed that `.stack`, which is what workerd serializes for an Error argument, also contains the
token. The conclusion holds.

## Recalibrated remediation

- Sanitize in **three** places, not two: `app.onError`, `describeOAuthConnectFailure`, and Better
  Auth set to `onAPIError: { throw: true }` so its errors reach `app.onError`. A Better Auth
  `logger` alone leaves better-call's `# SERVER_ERROR` line.
- For a `DrizzleQueryError` (detect it by the `query`/`params` own props, because `name` is `Error`),
  log only `cause.message`.
- Optional: `verification.storeIdentifier: 'hashed'` as defense in depth. It invalidates reset and
  verify links already in flight when deployed, and it does not remove the token from the logged
  request URL.
- Fix check: the lane repro shows `tokenInLog=false` and still returns 500, **and** no captured
  console arg has a `.stack` that contains the token.
