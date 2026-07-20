# Implementation prompt 06: public/auth trust and Account status

## Role and outcome

Own the public entry, authentication/recovery trust frame, first-use coherence, and quiet Account status
workspace. The instructor should understand the private solo creator product, what Ritmo stores, what providers
own, and how account/music status can be recovered without implying data loss.

## Authority

Implementation only after separate owner authorization. No branch, commit, push, PR, merge, deploy, account
mutation outside local fixtures, deletion, cleanup, or other prompt without separate permission.

## Required reads and baseline

Read current `AGENTS.md`, audit sequence/brief/backlog/decisions/inventory, PUB/ACC/CONN current/proposed evidence,
and landed prompt 01/02/03 contracts. Reverify current `origin/main`. Audited baseline:
`addaff3f6ce6c083bc46c2f10eaac7faaf09ea4b`; inspect drift first. Never place supplied credentials or personal
provider-library content in source, fixtures, logs, screenshots, or handoffs.

## Approved scope

- Owning IDs: P1-06, P1-07.
- Inventory/anchors: PUB-01–PUB-07, CLS-00/02 first use, ACC-01–ACC-03, and ACC-02/CONN-02 vocabulary reuse.
- Direction: public/auth prove the actual Find → Shape → Score → Lead loop and private-beta boundary; Account is
  a quiet identity/defaults/security/provider ledger using shared capability and recovery language.
- Inherited acceptance: pressure-safe accessibility, product-specific state copy, recovery grammar, and provider
  capability truth.

## Behavior before appearance

Preserve sign-in/sign-up/social auth, invitation gate, recovery/reset routes, not-found/privacy behavior,
onboarding, profile/default mutations, provider management, and security boundaries. Sign in with Apple and
Apple Music remain distinct. A failed Account load must not imply logout, deletion, or changed settings.

Do not surface dormant community, public classes, sharing, Teams, collaborators, pricing, or subscriptions.

## File ownership and collisions

Likely owned files:

- `apps/web/src/components/MarketingPage.tsx` and tests
- `apps/web/src/components/Login.tsx` and tests
- `apps/web/src/components/ResetPassword.tsx`, `PrivacyPage.tsx`, `NotFound.tsx`, `OnboardingVideoDialog.tsx`
- `apps/web/src/App.tsx` only for existing route/state composition, with focused tests
- Account portions of `apps/web/src/components/Dashboard.tsx` and scoped tests
- `apps/web/src/components/AccountDialog.tsx` and tests if still active in the current composition
- consumer use of `ConnectionsDialog`/provider vocabulary; surface-scoped `index.css`

Collision rules: prompt 01, prompt 02’s Class Pulse contract, and prompt 03’s provider contract land first.
Serialize Account edits in `Dashboard.tsx` and all `index.css` edits with prompts 02–04. Provider mapping remains
owned by prompt 03.

Frozen: API/auth contract and private-beta behavior, schema/migrations/OpenAPI/shared contracts, provider
runtime/config/secrets, dormant surfaces, P2 artwork/motion.

## Implementation order

1. Map public/auth/account routes and current error/mutation behavior; add regression tests for preserved
   boundaries.
2. Recompose public entry around concrete creator-workstation proof and provider-authorized trust.
3. Align sign-in/sign-up/invitation/recovery/reset/privacy/not-found without changing auth semantics.
4. Align first-use language with equal music/template/movement starts.
5. Recompose Account identity, defaults, security/privacy, provider summary, and unavailable state.
6. Reuse prompt 03 capability rows/words and prompt 01 recovery/accessibility primitives.
7. Exercise auth/account success and failure with disposable local fixtures only.

## Design translation

Public/auth is product entry, not a campaign. Use real Class Pulse/workstation proof only through the landed
shared contract; no invented marketing/community promise. Account is quieter and denser than Builder, with one
status ledger rather than competing cards. Use canonical tokens; no deferred artwork/motion.

## Responsive and hostile cases

Desktop, 390, direct 320, 640 CSS-pixel reflow. Test long names/emails, invitation/API messages, expired reset
links, missing profile image, failed Account/provider loads, social-auth availability, keyboard viewport, and
long privacy text. No page overflow or clipped primary action.

## Accessibility

Correct form labels/autocomplete/error association, keyboard order, visible focus, 44px targets, status/alert
semantics, non-color meaning, reduced motion, focus after submit/error, and headings/landmarks that retain product
context without overwhelming the auth task.

## State coverage

PUB-01 entry, PUB-02 auth, PUB-03 recovery request, PUB-04 privacy, PUB-05 reset completion/expired, PUB-06 not
found, PUB-07 invitation required, CLS-00/02 first use, ACC-01 profile/defaults/security, ACC-02 connections,
ACC-03 unavailable; include loading, submit pending, field/API error, success, retry, and safe return.

## Tests and gates

Add focused public/auth/account tests without real credentials. Run affected tests, web suite, format, typecheck,
lint, design-system verify, web build, remaining CI-equivalent gate, secret scan, and `git diff --check`.

## Visual verification

Real-browser compare every PUB and ACC anchor plus CLS-00/02 at desktop/mobile. Use synthetic/disposable identity
data. Confirm invitations and failures from local fixtures where safe; label code-confirmed states honestly when
not induced.

## Acceptance criteria

- P1-06: public/auth/first use consistently communicate a private solo creator workstation and provider/data
  boundaries without dormant feature claims.
- P1-07: Account consolidates identity/defaults/security/provider status and never reinterprets capability state.
- Invitation and Account failures preserve intent/context and say what remains safe.
- Existing auth/account mutations, routes, privacy, and provider management remain correct.
- No secret, personal library content, or deferred/dormant scope enters artifacts or code.

## Failure and stop conditions

Stop for auth/API/schema/provider/legal/privacy-policy changes, ambiguous Account mutation behavior, or any need
to transmit/use real credentials beyond explicitly authorized real-browser evaluation. Do not widen the beta or
product boundary.

## Handoff

Report changed files, auth/account behavior preserved, tests/gates, screenshots, fixture provenance, remaining
evidence gaps, secret-scan result, and unauthorized actions not taken.

Suggested branch: `codex/public-auth-account-trust`  
Suggested PR title: `feat(web): align public auth and account trust`
