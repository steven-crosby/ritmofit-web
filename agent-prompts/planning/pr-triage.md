# PR triage — process the maintenance queue (read-only by default)

> **READ-ONLY** review + recommendations. Don't merge. The technical prompts OPEN draft
> PRs; this one helps me CLEAR them fast.

For `ritmofit-web`, list every open PR (focus on `auto-maintenance`) and for each give:

- **Verdict:** ✅ ready to merge / 🔧 needs a tweak / ⏸ hold / ❌ close — one-line why.
- **Risk** (low/med/high) and **review effort** (S/M/L).
- **Conflicts / stale:** flag anything behind the base branch or colliding with another
  open PR.
- **Merge order:** a suggested sequence that minimises rebasing.

End with a clean "merge these N now, look harder at these M, close these K" summary.

> Optional: if I include the word **ACT**, read this repo's `AGENTS.md`, fetch first, and
> rebase only trivially stale `auto-maintenance` branches with green checks. Use
> `--force-with-lease` if updating a rebased remote branch. Do not modify source, resolve
> non-trivial conflicts, merge, or act on non-agent branches.
