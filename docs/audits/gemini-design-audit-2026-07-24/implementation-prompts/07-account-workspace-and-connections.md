# Implementation Prompt 07: Account Workspace & Music Connections Status (`P2-02`)

**Goal:** Refine the Account settings workspace and provider connection cards (`ConnectionsDialog.tsx`) for visual clarity and instant auth health inspection.

**Authority:** Implementation only. Do not commit, push, open PR, or deploy unless granted.

---

## Task Instructions

1. **Inspect Code:**
   Read `apps/web/src/components/AccountDialog.tsx`, `ConnectionsDialog.tsx`, and `ProviderCapabilityLedger.tsx`.

2. **Implement Account UI:**
   - Update Account settings view to feature clear instructor profile details and primary discipline selection.
   - Present Spotify, Apple Music, and SoundCloud auth connections as distinct visual cards with status indicators (Connected, Reconnect Required, Unlinked).

3. **Verification:**
   Run:
   ```bash
   pnpm --filter @ritmofit/web build
   pnpm test
   ```
