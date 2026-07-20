# Shared UI foundations contract

Prompt 01 owns the shared state grammar for P0-07, P0-08, P1-03, and P1-04. Prompts 02–06 consume this
contract; they do not fork its state semantics, palette, or announcement behavior.

## Exported components

`apps/web/src/components/SharedState.tsx` exports:

- `StatusLabel`: glyph plus visible label, with semantic color as reinforcement only. It never creates a
  live region by itself.
- `RecoveryState`: fixed event → safety → primary action → secondary escape reading order. The caller
  chooses `alert` or polite `status` semantics and supplies task-specific copy.
- `WorkspaceLoadingState`: authenticated-workspace silhouette without invented account, class, or provider
  data.

Existing `PendingList` consumes `StatusLabel` for loading and keeps a 44px retry target after failure.

## State matrix

| State             | Shared contract                          | Surface-specific owner                            |
| ----------------- | ---------------------------------------- | ------------------------------------------------- |
| Loading           | `StatusLabel` / `WorkspaceLoadingState`  | Each prompt names the task being loaded           |
| Empty             | `StatusLabel`                            | Owning surface supplies the legitimate first step |
| Unavailable       | `StatusLabel` / `RecoveryState`          | Owning surface states what remains usable         |
| Error/interrupted | `StatusLabel` / `RecoveryState`          | Owning surface supplies bounded recovery          |
| Update available  | `RecoveryState`                          | `UpdatePrompt` preserves Reload now / Later       |
| Disabled          | `StatusLabel` plus native disabled state | Owning control explains the unmet condition       |
| Retrying          | `StatusLabel`                            | Owning async action preserves context             |
| Recovered         | `StatusLabel`                            | Owning surface announces only meaningful recovery |

Empty, unavailable, disconnected, unauthorized, and deleted are never aliases. Loading shapes are
`aria-hidden`; the named containing status is announced once. Recovery copy may promise only behavior
the current client can prove.

## Visual and interaction contract

- Copper remains the one primary authoring or recovery action; cyan remains interaction, focus, and
  playback truth; amber is caution; ember is interruption/error.
- Bricolage is reserved for earned recovery/display headings, Sora carries instructions and actions,
  and Azeret carries data and compact instrument labels.
- Every visible mobile action has a 44×44px target or a proven equivalent hit area.
- Focus remains visible, logical, and persistent. Shared labels do not add nested live regions.
- Reduced motion removes affect, never state text. Prompt 01 adds no beat-aware or decorative motion.
- Raised depth is reserved for the update tray and critical recovery; ordinary status remains contained.

## Preserved behavior

Routing, authentication, fetch and retry semantics, provider capability truth, dialog behavior, explicit
service-worker update choice, one-shot stale-chunk reload protection, and global versus Live error-boundary
reset behavior remain unchanged. Prompt 01 does not alter API, schema, OpenAPI, shared contracts, provider
runtime, playback, or persistence.

## Downstream acceptance

Prompts 02–06 must reuse the exported state identity and recovery order, provide task-specific copy only
where the current capability is known, keep one focal action, use Azeret for time/data, survive 320px and
200%-equivalent reflow, and preserve non-color meaning and reduced-motion labels. Surface owners remain
responsible for their own empty, permission, provider, preview, Live, and recovery state tests.
