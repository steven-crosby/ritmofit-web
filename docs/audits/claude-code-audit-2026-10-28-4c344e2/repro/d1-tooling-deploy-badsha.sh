#!/usr/bin/env bash
# Repro (rejected lead R-deploy-badsha): an unresolvable sha makes resolve_deploy_sha return 0 with an
# EMPTY sha, because bash clears `set -e` inside $(...) and the function ends in `return 0`.
# Sandbox only: local bare origin, PATH stubs for pnpm/npx that refuse to run. Never reaches wrangler.
# Usage: bash d1-tooling-deploy-badsha.sh <repo-worktree>   (relative or absolute path)
set -uo pipefail
# Resolve the worktree before the cd into the sandbox repo below, so a relative path still works.
W="$(cd "${1:?worktree}" && pwd)" || exit 1
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
git init -q --bare "$T/origin.git"
git init -q -b main "$T/repo"; cd "$T/repo"
git config user.email x@example.test; git config user.name x
mkdir scripts; cp "$W"/scripts/{deploy.sh,required-secrets.txt,production-smoke.txt} scripts/
cp "$W/.nvmrc" .; git add -A; git commit -qm init
git remote add origin "$T/origin.git"; git push -q origin main
mkdir "$T/bin"; printf '#!/bin/sh\necho "STUB $(basename $0) $* (refused)" >&2; exit 99\n' > "$T/bin/pnpm"; chmod +x "$T/bin/pnpm"
PATH="$T/bin:$PATH" bash scripts/deploy.sh nosuchref; echo "deploy.sh exit=$?"
