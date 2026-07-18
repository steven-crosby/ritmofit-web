# Implementation brief 06 — Account + Login

## Role

Act as the SPA Account, Login, and product-copy polish implementer. Separate read-only facts from settings,
make connection summaries compact, and state access/provider trust specifically.

## Authority

Gate C authorizes `P1-08`, `P1-11`, and `P2-01`. P1-08 permits deleting internal/generic copy across the
approved surfaces, but not adding marketing or changing product behavior. Consume the connection-summary
pattern from batch 2. This is commit batch 6 in the single approved draft PR.

## Backlog IDs

- `P1-08` — Delete internal and generic product copy
- `P1-11` — Make Login trust specific without making it marketing
- `P2-01` — Separate Account facts from editable settings

## User outcomes

- Understand invite-only access and provider-owned playback before signing in.
- Distinguish immutable account facts from settings that can actually be changed.
- See a compact connection summary without encountering three competing management surfaces.
- Read language written for instructors rather than implementers or dashboard administrators.

## Mockup references

- `../mockups/polish-preview.html#trust`
- `../mockups/polish-preview-notes.md`

Match the restrained trust statement, facts/settings separation, and compact provider summary. Do not copy
fake email/profile values, add a marketing hero, or imply open enrollment.

## Files to inspect / likely edit

- `apps/web/src/components/Login.tsx`
- `apps/web/src/components/Login.test.tsx`
- `apps/web/src/components/Dashboard.tsx`
  - `AccountWorkspace`
  - remaining internal/generic copy in approved surfaces
- `apps/web/src/components/Dashboard.test.tsx`
- `apps/web/src/components/AccountDialog.tsx`
- `apps/web/src/components/AccountDialog.test.tsx`
- `apps/web/src/components/ConnectionsDialog.tsx` only for integration with the batch 2 authority
- `apps/web/src/components/ConnectionsDialog.test.tsx`

## Out of scope

- Authentication flow, signup eligibility, invite backend, user schema, account deletion, or billing.
- New editable preferences without existing persistence and product authority.
- Marketing redesign, pricing, public signup, Spanish garnish, or decorative branding.
- Provider connection logic already owned by batch 2.
- Community, teams, or organization-account surfaces.

## Implementation steps

1. Inventory visible copy for storage contracts, internal product framing, duplicated workspace/home labels,
   generic dashboard language, and open-enrollment implications.
2. Update Login with one restrained invite-only statement and one provider-ownership trust statement.
   Preserve every auth state, error, recovery, and accessibility contract.
3. Recompose Account into read-only facts and genuinely editable settings. Do not style facts as controls.
4. Present one compact provider summary with a single Manage action into `ConnectionsDialog`; do not clone
   detailed reconnect controls in Account.
5. Remove or rewrite internal/generic copy in Classes, Music, Builder, Live, Account, and Login only where
   the approved batches already touch the surface. Avoid a drive-by product-wide rewrite.
6. Add exact copy assertions only for durable product truth; prefer semantic assertions for volatile prose.
7. Verify signed-out/error/invite states, long email/account values, desktop, 390px, 320px, and 200% zoom.

## Tests and checks

```bash
pnpm --filter @ritmofit/web test \
  src/components/Login.test.tsx \
  src/components/Dashboard.test.tsx \
  src/components/AccountDialog.test.tsx \
  src/components/ConnectionsDialog.test.tsx
pnpm --filter @ritmofit/web typecheck
pnpm --filter @ritmofit/web build
pnpm format:check
pnpm lint
```

Manual: signed-out Login, invalid/expired auth response, invited-user path, Account with connected/expired/
disconnected providers, long values, keyboard use, desktop, 390×844, 320px, and 200% zoom.

## Acceptance criteria

- Login states invite-only access and provider-owned playback in restrained, accurate language.
- No signup CTA implies open enrollment.
- Read-only account facts do not look interactive; only persisted controls look editable.
- Account has one compact provider summary and one Manage action; detailed actions remain in the dialog.
- Approved surfaces no longer expose storage-contract or generic dashboard-administrator copy.
- Auth behavior, errors, focus, and recovery remain unchanged and tested.

## Suggested PR / branch

- Extracted PR title if needed: `feat(web): clarify account and login trust`
- Extracted branch if needed: `polish/account-login-trust`
- Current approved delivery: commit batch 6 on `polishv3/design-audit-mockups`.

## Stop / handoff

Report every changed user-facing string by surface, facts/settings ownership, connection-summary integration,
and auth-state evidence. Do not merge or deploy.

## Global constraints

- Keep the current Classes / Music / Live / Account shell; no IA redesign.
- Success ranking: build speed > gorgeous > Live pride.
- Builder stays airy and consumer-music scannable; Live remains 80% safety/glanceability and 20% swagger.
- Never cache provider audio or provider-derived analysis; never obtain BPM from Spotify; never download,
  proxy, mix, crossfade, decode, analyze, or derive provider audio. Playback uses official provider paths.
- Prefer small diffs. When tokens change, update design-system guidance and regenerate iOS tokens when the
  package workflow requires it.
- Do not merge or deploy without separate owner authorization.
