# Authorization

One centralized access model. Every class-scoped read/write goes through a single helper in
`apps/api/src/lib/authz.ts`. Do not scatter ad-hoc checks across routes — that's how inconsistent
access bugs creep in.

> **D1 has no row-level security.** Unlike Postgres, the database cannot back-stop access at the DB
> layer. The application-level helper is therefore the **only** gate. This file is load-bearing.

## The model in one sentence

A class has exactly one **owner**; everyone else gets access only through a **share**, which may be
granted directly to a user or to a whole team (Google Drive model).

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
  else                                       -> NONE
```

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

## The `GET /classes` union

Listing visible classes is:

```sql
-- owned
SELECT c.* FROM classes c WHERE c.owner_user_id = :me
UNION
-- shared directly to me
SELECT c.* FROM classes c
  JOIN shares s ON s.resource_id = c.id
  WHERE s.resource_type = 'class' AND s.target_user_id = :me
UNION
-- shared to a team I'm in
SELECT c.* FROM classes c
  JOIN shares s ON s.resource_id = c.id
  JOIN team_memberships tm ON tm.team_id = s.target_team_id
  WHERE s.resource_type = 'class' AND tm.user_id = :me;
```

A deliberate, named query shape — fine at our scale and plain SQLite (no Postgres-only constructs). If
it ever becomes hot, the fix is an index / a materialized membership view, **not** denormalizing
ownership onto classes.

## Implementation notes

- Expose `requireAccess(userId, classId, minLevel)` that throws a typed `403` (or `404` for NONE) so
  routes stay thin.
- Resolve team membership in the same query where possible to avoid N+1.
- A team's `owner`/`admin` roles govern **team membership management**, not class access. Class access
  always derives from ownership + shares, even when a class is shared *to* a team.
- Because there's no RLS, **every** new class-scoped route must call `requireAccess` — add it to the
  route checklist in `ai-working-rules.md`. A missing call is a security bug, not a style nit.
