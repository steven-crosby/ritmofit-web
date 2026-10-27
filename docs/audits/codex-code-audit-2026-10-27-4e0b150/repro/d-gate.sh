#!/usr/bin/env bash
# Runs the AGENTS.md gate once in the disposable worktree; logs to the audit evidence dir.
cd /tmp/wt-d || exit 1
EV=/workspace/docs/audits/codex-code-audit-2026-10-27-4e0b150/evidence
SUM=$EV/d-gate-summary.tsv
printf 'step\texit\tseconds\tcommand\n' > "$SUM"
run() {
  local name=$1; shift
  local start=$(date +%s%N)
  bash -c "$*" > "$EV/d-$name.log" 2>&1
  local rc=$?
  local end=$(date +%s%N)
  printf '%s\t%s\t%.1f\t%s\n' "$name" "$rc" "$(awk -v a=$start -v b=$end 'BEGIN{print (b-a)/1e9}')" "$*" >> "$SUM"
}
run 01-format-check 'pnpm format:check'
run 02-typecheck 'pnpm -r typecheck'
run 03-lint 'pnpm lint'
run 04-ds-verify 'cd ritmofit_design_system && npm run verify'
run 05-theme-classes-selftest 'pnpm --filter @ritmofit/web theme-classes --selftest'
run 06-theme-classes 'pnpm --filter @ritmofit/web theme-classes'
run 07-test 'pnpm test'
run 08-test-integration 'pnpm --filter @ritmofit/api test:integration'
run 09-web-build 'pnpm --filter @ritmofit/web build'
run 10-bundle-budget-selftest 'pnpm --filter @ritmofit/web bundle-budget --selftest'
run 11-openapi 'pnpm --filter @ritmofit/api openapi && git diff --stat --exit-code apps/api/openapi/openapi.json'
run 12-contract-parity 'pnpm --filter @ritmofit/api contract-parity'
run 13-audit-ci 'pnpm audit:ci'
run 14-worktree-status 'git status --porcelain'
echo DONE >> "$SUM"
