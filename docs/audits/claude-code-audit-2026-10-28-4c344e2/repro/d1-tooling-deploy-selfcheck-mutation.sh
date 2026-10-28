#!/usr/bin/env bash
# Repro T-01: deploy.sh --self-check's "git guard and /tmp worktree" block runs its subshell as the
# left side of `( ... ) && pass || fail`, so bash ignores `set -e` inside it. Only explicit `exit 1`
# and the LAST command decide the result. This script mutates a COPY of scripts/deploy.sh three ways
# and shows each mutant still prints "self-check ok: git guard and /tmp worktree" and "self-check passed".
# Usage: bash d1-tooling-deploy-selfcheck-mutation.sh <repo-worktree>   (never deploys; --self-check only)
set -uo pipefail
W="${1:?worktree}"
cd "$W"
run() {
  local name="$1" file="$2"
  cp "$file" scripts/deploy.sh.mut
  out="$(bash scripts/deploy.sh.mut --self-check 2>&1)"; st=$?
  # SCRIPT_DIR line-2 check reads deploy.sh, not the mutant, so it is unaffected.
  printf '%-48s exit=%s  %s | %s\n' "$name" "$st" \
    "$(grep -c 'self-check ok: git guard and /tmp worktree' <<<"$out")x guard-ok" \
    "$(grep -E 'self-check (passed|failed)' <<<"$out")"
  rm -f scripts/deploy.sh.mut
}
tmp="$(mktemp -d)"
cp scripts/deploy.sh "$tmp/base"
run "baseline" "$tmp/base"
# M1: refusal message for dirty tree changes (asserted by: grep -q "not empty" "$dirty_err")
sed 's/refusing to deploy: git status --porcelain is not empty/refusing: dirty/' "$tmp/base" > "$tmp/m1"
run "M1 dirty-tree message no longer 'not empty'" "$tmp/m1"
# M2: divergence message changes (asserted by: grep -q "not origin/main" "$diverge_err")
sed 's/is not origin\/main/differs from upstream/' "$tmp/base" > "$tmp/m2"
run "M2 diverge message no longer 'not origin/main'" "$tmp/m2"
# M3: deploy worktree checks out the PARENT of the requested sha
#     (asserted by: [[ "$(git -C "$wt" rev-parse HEAD)" == "$(git rev-parse HEAD)" ]])
sed 's|git worktree add --detach "\$wt" "\$sha" >&2|git worktree add --detach "$wt" "$sha~1" >\&2|' "$tmp/base" > "$tmp/m3"
grep -n 'worktree add --detach "\$wt"' "$tmp/m3"
run "M3 worktree builds sha~1 instead of sha" "$tmp/m3"
rm -rf "$tmp"
