# Authorization

One centralized access model. Every class-scoped read/write goes through a single helper in
`apps/api/src/lib/authz.ts`. Do not scatter ad-hoc checks across routes — that's how inconsistent
access bugs creep in.

> **D1 has no row-level security.** Unlike Postgres, the database cannot back-stop access at the DB
> layer. The application-level helper is therefore the **only** gate. This file is load-bearing.

## The model in one sentence

A class has exactly one **owner**; everyone else gets access only through a **share**, which may be
granted directly to a user or to a whole team (Google Drive model).

> **D20 solo-first note:** this access model still exists in backend scaffolding, but sharing, teams,
> public visibility, and Explore are dormant/deferred product surfaces. Preserve the centralized helper;
> do not build new user-facing collaboration or publishing workflows unless the owner explicitly reopens
> that work. The current web product should present the caller's own personal library.

## Access levels

For any (user, class) pair, effective access is the **highest** of:

1. **Owner** — `class.owner_user_id == user.id`. Full control, including delete and managing shares.
2. **Edit share** — a `shares` row where `resource_type='class'`, `resource_id=class.id`,
   `permission='edit'`, and the user is the target (directly, or via membership in the target team).
3. **View share** — same with `permission='view'`. Read-only.
4. **None** — no access. Treat as **404** (don't reveal existence).

```
effectiveAccess(user, class):
  if class.owner_user_id == user.id          -> OWNER
  shares = sharesFor(class)
  if any share grants user EDIT              -> EDIT
  if any share grants user VIEW              -> VIEW
  if class.visibility == 'public'            -> VIEW   # M4 public floor
  else                                       -> NONE
```

### The public visibility floor (M4)

A class with `visibility = 'public'` (the owner published it to Explore) grants
**VIEW** to **any authenticated user**. This floor sits *below* shares, so it never
caps higher access (owner/edit/view-share still win) and never grants more than
VIEW. It lives **inside `resolveAccess`** — still one gate — so every class-scoped
read (`GET /classes/:id`, `/run-payload`, …) serves a public class without a
parallel code path. It deliberately does **not** feed `listVisibleClasses`: a public
class you don't own/aren't shared on stays out of your `GET /classes` ("my classes")
list — discovery is the separate, public `GET /explore` feed. Default is `private`,
so nothing is public until explicitly published.

Under D20, this floor is retained as dormant scaffolding. Do not expose Publish/Make private or Explore
entry points in the current solo-first web product.

Where "a share grants user X":
- `target_user_id == X.id`, OR
- `target_team_id` is a team X belongs to (`team_memberships`).

## Permission requirements by operation

| Operation | Minimum access |
|---|---|
| Read class / its tracks / cues / moves / run-payload | VIEW |
| Create/update/delete tracks, cues, moves; reorder; copy-in target | EDIT |
| Update class fields | EDIT |
| Delete class | OWNER |
| Manage shares (create/update/revoke), list shares | OWNER |

Choreography resources (`cues`, `class_track_moves`) and `class_tracks` carry no ACL of their own — the
helper resolves the parent chain `cue/move → class_track → class` and applies the class's access level.

## Non-class resources (owner-scoped, NOT `requireAccess`)

`requireAccess` is the gate for **class-scoped** resources only. Some resources are owned directly by a
user and have no class in their chain — they get a **simple ownership check**, not `requireAccess`:

| Resource | Rule |
|---|---|
| `tracks`, `track_provider_ids` | Per-user library (M1, D4). Read/update/delete require `track.owner_user_id == me`. Attaching a class_track that references a track also requires the caller to own that track. |
| `user_moves` | The caller's custom language. Read/update/delete require `user_move.user_id == me`. |
| `teams`, `team_memberships` | Membership management is governed by team role (see below), not by `requireAccess`. |

These checks are small and local but still **mandatory** — D1 has no RLS, so an ownerless route is an
open route. Keep them out of `requireAccess` so its contract stays "class access only" and doesn't blur.

> **Team membership management** (add/remove members, etc.) is gated by `teams.owner_user_id` (the
> authoritative owner) plus `team_memberships.role` for `admin`. This is **separate** from class access:
> a team role never, by itself, grants access to a class — class access always derives from ownership +
> shares, even when a class is shared *to* a team.

## The `GET /classes` union

Listing visible classes is one D1 query:

```sql
WITH access_candidates(class_id, access_rank) AS (
  SELECT id, 3 FROM classes WHERE owner_user_id = :me
  UNION ALL
  SELECT resource_id, CASE permission WHEN 'edit' THEN 2 ELSE 1 END
    FROM shares
    WHERE resource_type = 'class' AND target_user_id = :me
  UNION ALL
  SELECT s.resource_id, CASE s.permission WHEN 'edit' THEN 2 ELSE 1 END
    FROM team_memberships tm
    JOIN shares s ON s.target_team_id = tm.team_id
    WHERE tm.user_id = :me AND s.resource_type = 'class'
),
visible AS (
  SELECT class_id, MAX(access_rank) AS access_rank
  FROM access_candidates
  GROUP BY class_id
)
SELECT c.*, visible.access_rank
FROM visible
JOIN classes c ON c.id = visible.class_id
ORDER BY c.updated_at DESC, c.id DESC;
```

Web callers add a bounded keyset predicate on `(updated_at, id)` plus `LIMIT`; the response body remains
the existing array and carries the next opaque cursor in `X-RitmoFit-Next-Cursor`. Unparameterized
requests retain the legacy full list for the current iOS cache sync. Supporting indexes select owned,
direct-share, and team-share candidates before the final sort. This remains plain SQLite; do not
denormalize ownership onto classes.

Under D20, the current web UI filters the returned list to owned classes so old share rows do not
reintroduce the community model. The backend union remains for now.

## Implementation notes

- Expose `requireAccess(userId, classId, minLevel)` that throws a typed `403` (or `404` for NONE) so
  routes stay thin.
- Resolve team membership in the same query where possible to avoid N+1.
- A team's `owner`/`admin` roles govern **team membership management**, not class access. Class access
  always derives from ownership + shares, even when a class is shared *to* a team.
- Because there's no RLS, **every** new class-scoped route must call `requireAccess` (see the
  authorization rules in `../AGENTS.md` → "Coding & Domain Rules"). A missing call is a security bug,
  not a style nit.
