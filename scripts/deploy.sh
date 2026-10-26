#!/usr/bin/env bash
set -euo pipefail

# Deploy the Cloudflare Worker that serves https://ritmofit.studio.
# See ritmofit_dev_plan/deployment-runbook.md.
#
#   scripts/deploy.sh              # clean tree whose HEAD is origin/main
#   scripts/deploy.sh <sha>        # clean tree; HEAD may differ from origin/main
#   scripts/deploy.sh --self-check # local guards only; does not deploy
#
# A dirty tree always refuses, including when a sha is passed. The sha only
# permits a HEAD that is not origin/main.
#
# The script checks out a detached worktree under /tmp and builds there.
# ritmofit_design_system has no lockfile and no dependencies: do not npm ci.

PROPAGATION_TRIES=30
PROPAGATION_SLEEP_SECONDS=10
PROPAGATION_CONSECUTIVE=3

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REQUIRED_SECRETS_FILE="${SCRIPT_DIR}/required-secrets.txt"
SMOKE_FILE="${SCRIPT_DIR}/production-smoke.txt"

usage() {
  printf '%s\n' \
    "usage: scripts/deploy.sh [sha]" \
    "       scripts/deploy.sh --self-check" \
    "git status --porcelain must be empty. A dirty tree always refuses." \
    "With no sha, HEAD must equal origin/main. A sha deploys that commit anyway."
}

nvmrc_major() {
  local contents="$1"
  local line major
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="${line//[[:space:]]/}"
    [[ -z "$line" ]] && continue
    line="${line#v}"
    line="${line#V}"
    major="${line%%.*}"
    if [[ ! "$major" =~ ^[0-9]+$ ]]; then
      return 1
    fi
    printf '%s\n' "$major"
    return 0
  done <<< "$contents"
  return 1
}

node_major() {
  local version="$1"
  version="${version#v}"
  version="${version#V}"
  version="${version%%.*}"
  if [[ ! "$version" =~ ^[0-9]+$ ]]; then
    return 1
  fi
  printf '%s\n' "$version"
}

assert_node_major() {
  local nvmrc_contents="$1"
  local node_version="$2"
  local required actual
  if ! required="$(nvmrc_major "$nvmrc_contents")"; then
    printf '%s\n' "node check failed: .nvmrc has no major version" >&2
    return 1
  fi
  if ! actual="$(node_major "$node_version")"; then
    printf '%s\n' "node check failed: could not read a node major from '${node_version}'" >&2
    return 1
  fi
  if [[ "$actual" != "$required" ]]; then
    printf '%s\n' "node major ${actual} does not match .nvmrc ${required}" >&2
    return 1
  fi
  printf '%s\n' "node major ${actual} matches .nvmrc"
}

# Prints the commit to deploy. A dirty tree always refuses. With no argument,
# HEAD must equal origin/main. An explicit sha skips only that HEAD check.
resolve_deploy_sha() {
  if [[ -n "$(git status --porcelain)" ]]; then
    printf '%s\n' "refusing to deploy: git status --porcelain is not empty" >&2
    return 1
  fi
  if [[ $# -gt 0 && -n "${1:-}" ]]; then
    git rev-parse --verify "${1}^{commit}"
    return 0
  fi
  local head origin_main
  head="$(git rev-parse HEAD)"
  origin_main="$(git rev-parse origin/main)"
  if [[ "$head" != "$origin_main" ]]; then
    printf '%s\n' "refusing to deploy: HEAD ${head} is not origin/main ${origin_main}" >&2
    return 1
  fi
  printf '%s\n' "$head"
}

create_deploy_worktree() {
  local sha="$1"
  local wt
  wt="$(mktemp -d /tmp/ritmofit-deploy.XXXXXX)"
  rmdir "$wt"
  git worktree add --detach "$wt" "$sha" >&2
  printf '%s\n' "$wt"
}

# Read wrangler secret list JSON on stdin. Write names only, one per line.
# Never prints the raw payload or any field other than a safe name.
secret_names_from_json() {
  node -e '
    const fs = require("fs");
    let data;
    try {
      const raw = fs.readFileSync(0, "utf8");
      const start = raw.indexOf("[");
      const end = raw.lastIndexOf("]");
      if (start < 0 || end < start) throw new Error("no array");
      data = JSON.parse(raw.slice(start, end + 1));
    } catch (err) {
      console.error("wrangler secret list was not a JSON array; refusing to print the response");
      process.exit(1);
    }
    if (!Array.isArray(data)) {
      console.error("wrangler secret list was not a JSON array; refusing to print the response");
      process.exit(1);
    }
    for (const item of data) {
      const name = item && typeof item === "object" ? item.name : null;
      if (typeof name !== "string" || !/^[A-Z][A-Z0-9_]*$/.test(name)) {
        console.error("secret list entry had an unexpected name; refusing to print it");
        process.exit(1);
      }
      process.stdout.write(name + "\n");
    }
  '
}

# Return 0 when every + -separated name is in present_file.
group_present() {
  local group="$1"
  local present_file="$2"
  local names="$group"
  local name
  while [[ -n "$names" ]]; do
    name="${names%%+*}"
    if [[ "$names" == *"+"* ]]; then
      names="${names#*+}"
    else
      names=""
    fi
    if [[ -z "$name" ]]; then
      return 2
    fi
    if ! grep -qx -- "$name" "$present_file"; then
      return 1
    fi
  done
  return 0
}

# Return 0 if one |-separated alternative in the requirement line is present.
requirement_satisfied() {
  local line="$1"
  local present_file="$2"
  local alternatives="$line"
  local alternative status
  while [[ -n "$alternatives" ]]; do
    alternative="${alternatives%%|*}"
    if [[ "$alternatives" == *"|"* ]]; then
      alternatives="${alternatives#*|}"
    else
      alternatives=""
    fi
    if [[ -z "$alternative" ]]; then
      return 2
    fi
    if group_present "$alternative" "$present_file"; then
      return 0
    else
      status=$?
    fi
    if [[ "$status" -eq 2 ]]; then
      return 2
    fi
  done
  return 1
}

check_required_secrets() {
  local spec_file="$1"
  local present_file="$2"
  local line trimmed missing=0 status
  while IFS= read -r line || [[ -n "$line" ]]; do
    trimmed="${line%%#*}"
    trimmed="${trimmed//[[:space:]]/}"
    [[ -z "$trimmed" ]] && continue
    if requirement_satisfied "$trimmed" "$present_file"; then
      continue
    else
      status=$?
    fi
    if [[ "$status" -eq 2 ]]; then
      printf '%s\n' "required-secrets list has an empty name in: ${trimmed}" >&2
      return 1
    fi
    printf '%s\n' "missing required secret: ${trimmed}" >&2
    missing=1
  done < "$spec_file"
  [[ "$missing" -eq 0 ]]
}

print_hashes() {
  local label="$1"
  shift
  printf '%s\n' "$label"
  printf '%s\n' "hashes seen:"
  if [[ $# -gt 0 ]]; then
    printf '%s\n' "$@"
  fi
}

propagation_loop() {
  local expected="$1"
  local max_tries="$2"
  local sleep_s="$3"
  local consecutive_needed="$4"
  local fetcher="$5"
  local -a seen=()
  local consecutive=0
  local i hash hash_file
  # Redirect the fetcher instead of capturing it. A command substitution would
  # run it in a subshell and drop any in-shell progress it records.
  hash_file="$(mktemp)"
  for ((i = 1; i <= max_tries; i++)); do
    "$fetcher" "$i" >"$hash_file"
    hash="$(tr -d '\n' <"$hash_file")"
    seen+=("$hash")
    if [[ "$hash" == "$expected" ]]; then
      consecutive=$((consecutive + 1))
      if [[ "$consecutive" -ge "$consecutive_needed" ]]; then
        rm -f "$hash_file"
        print_hashes "propagation ok after ${i} tries; expected ${expected}" "${seen[@]}"
        return 0
      fi
    else
      consecutive=0
    fi
    if [[ "$i" -lt "$max_tries" && "$sleep_s" != "0" ]]; then
      sleep "$sleep_s"
    fi
  done
  rm -f "$hash_file"
  print_hashes "propagation failed after ${max_tries} tries; expected ${expected}" "${seen[@]}"
  return 1
}

fetch_entry_hash() {
  local nonce="$1"
  local body hash
  body="$(
    curl -sS --max-time 20 -H 'Cache-Control: no-cache' \
      "https://ritmofit.studio/?cb=${nonce}-${RANDOM}" || true
  )"
  hash="$(printf '%s\n' "$body" | grep -oE -m 1 'assets/index-[A-Za-z0-9_-]+\.js' || true)"
  if [[ -z "$hash" ]]; then
    printf '%s\n' "(none)"
  else
    printf '%s\n' "$hash"
  fi
}

curl_status() {
  local url="$1"
  curl -sS -o /dev/null --max-time 20 -w '%{http_code}' "$url"
}

smoke_statuses() {
  local file="$1"
  local fetcher="${2:-curl_status}"
  local line url expected got fails=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" ]] && continue
    read -r url expected <<< "$line"
    if [[ -z "$url" || -z "$expected" || ! "$expected" =~ ^[0-9][0-9][0-9]$ ]]; then
      printf '%s\n' "bad smoke line: ${line}" >&2
      return 1
    fi
    got="$("$fetcher" "$url")"
    if [[ "$got" != "$expected" ]]; then
      printf '%s\n' "smoke failed: ${url} expected ${expected} got ${got}" >&2
      fails=1
    else
      printf '%s\n' "smoke ok: ${url} ${got}"
    fi
  done < "$file"
  [[ "$fails" -eq 0 ]]
}

security_headers_ok() {
  local dump="$1"
  local token missing=0
  for token in strict-transport content-security x-frame x-content-type referrer permissions; do
    if ! grep -qi "$token" <<< "$dump"; then
      printf '%s\n' "missing security header matching: ${token}" >&2
      missing=1
    fi
  done
  [[ "$missing" -eq 0 ]] || return 1
  printf '%s\n' "security headers present"
  grep -iE 'strict-transport|content-security|x-frame|x-content-type|referrer|permissions' <<< "$dump"
}

fetch_security_headers() {
  curl -sS -D - -o /dev/null --max-time 20 https://ritmofit.studio/api/v1/health
}

run_gates() {
  pnpm format:check
  pnpm -r typecheck
  pnpm lint
  # ritmofit_design_system has no dependencies and no lockfile. There is no
  # npm ci. verify runs with node only.
  (cd ritmofit_design_system && npm run verify)
  pnpm --filter @ritmofit/web theme-classes
  pnpm test
  pnpm --filter @ritmofit/api test:integration
  pnpm --filter @ritmofit/web build
  pnpm --filter @ritmofit/api openapi
  git diff --exit-code apps/api/openapi/openapi.json
  pnpm --filter @ritmofit/api contract-parity
  pnpm audit:ci
}

deploy_tree() {
  local sha="$1"
  local short wt names_file mig_out expected count
  short="$(git rev-parse --short "$sha")"
  printf '%s\n' "deploying ${sha} (${short})"

  DEPLOY_REPO="$(git rev-parse --show-toplevel)"
  wt="$(create_deploy_worktree "$sha")"
  DEPLOY_WT="$wt"
  printf '%s\n' "worktree: ${wt}"
  # EXIT runs in the shell, so keep the paths in globals. --force drops the
  # untracked install and build in the detached worktree.
  trap 'status=$?; cd /; git -C "$DEPLOY_REPO" worktree remove --force "$DEPLOY_WT" >/dev/null 2>&1 || true; exit $status' EXIT

  cd "$wt"
  pnpm install --frozen-lockfile

  names_file="$(mktemp)"
  if ! pnpm --filter @ritmofit/api exec wrangler secret list --format json | secret_names_from_json >"$names_file"; then
    rm -f "$names_file"
    printf '%s\n' "failed to read secret names" >&2
    exit 1
  fi
  count="$(wc -l <"$names_file" | tr -d '[:space:]')"
  printf '%s\n' "read ${count} secret names"
  check_required_secrets "$REQUIRED_SECRETS_FILE" "$names_file"
  rm -f "$names_file"

  mig_out="$(mktemp)"
  pnpm --filter @ritmofit/api exec wrangler d1 migrations list ritmofit --remote >"$mig_out"
  if ! grep -q "No migrations to apply" "$mig_out"; then
    printf '%s\n' "remote D1 has unapplied migrations; apply them, then rerun scripts/deploy.sh" >&2
    cat "$mig_out" >&2
    rm -f "$mig_out"
    exit 1
  fi
  rm -f "$mig_out"
  printf '%s\n' "remote D1 migrations: none to apply"

  printf '%s\n' "current Worker version (rollback target):"
  pnpm --filter @ritmofit/api exec wrangler deployments status

  run_gates
  pnpm --filter @ritmofit/web build

  expected="$(grep -oE -m 1 'assets/index-[A-Za-z0-9_-]+\.js' apps/web/dist/index.html || true)"
  if [[ -z "$expected" ]]; then
    printf '%s\n' "built index.html has no SPA entry hash" >&2
    exit 1
  fi
  printf '%s\n' "built entry: ${expected}"

  pnpm --filter @ritmofit/api exec wrangler deploy --message "$short"

  propagation_loop "$expected" "$PROPAGATION_TRIES" "$PROPAGATION_SLEEP_SECONDS" \
    "$PROPAGATION_CONSECUTIVE" fetch_entry_hash
  smoke_statuses "$SMOKE_FILE"
  security_headers_ok "$(fetch_security_headers)"
}

self_check() {
  local fails=0
  local out status
  fail() {
    printf '%s\n' "self-check FAIL: $*" >&2
    fails=$((fails + 1))
  }
  pass() {
    printf '%s\n' "self-check ok: $*"
  }

  local line2
  line2="$(sed -n '2p' "${SCRIPT_DIR}/deploy.sh")"
  if [[ "$line2" == "set -euo pipefail" ]]; then
    pass "set -euo pipefail"
  else
    fail "line 2 is not set -euo pipefail"
  fi

  if out="$(assert_node_major $'22\n' "v22.23.4" 2>&1)"; then
    pass "node 22 matches .nvmrc 22"
  else
    fail "node 22 should match ($out)"
  fi
  if out="$(assert_node_major "22.13" "v22.1.0" 2>&1)"; then
    pass "node 22.1 matches .nvmrc 22.13"
  else
    fail "node 22.1 should match 22.13 ($out)"
  fi
  if out="$(assert_node_major "22" "v26.7.0" 2>&1)"; then
    fail "node 26 should not match .nvmrc 22"
  else
    if [[ "$out" == *"does not match"* && "$out" != *"v26.7.0"* ]]; then
      pass "node 26 refused"
    else
      fail "node 26 refusal message was: $out"
    fi
  fi
  if out="$(assert_node_major $'# comment only\n\n' "v22.13.0" 2>&1)"; then
    fail "comment-only .nvmrc should fail"
  else
    if [[ "$out" == *"no major version"* ]]; then
      pass "comment-only .nvmrc is refused"
    else
      fail "comment-only .nvmrc output: $out"
    fi
  fi
  if out="$(assert_node_major $'# pin\n\nv22.13.0\n' "V22.23.4" 2>&1)"; then
    pass "commented .nvmrc matches node 22"
  else
    fail "commented .nvmrc should match ($out)"
  fi

  local present spec
  present="$(mktemp)"
  spec="$(mktemp)"
  cat >"$spec" <<'EOF'
# comment
BETA_ALLOWED_EMAILS
APPLE_TEAM_ID+APPLE_KEY_ID+APPLE_PRIVATE_KEY|APPLE_CLIENT_SECRET
APPLE_MUSIC_TEAM_ID+APPLE_MUSIC_KEY_ID+APPLE_MUSIC_PRIVATE_KEY|APPLE_MUSIC_DEVELOPER_TOKEN
EOF
  printf '%s\n' BETA_ALLOWED_EMAILS APPLE_CLIENT_SECRET APPLE_MUSIC_DEVELOPER_TOKEN >"$present"
  if check_required_secrets "$spec" "$present"; then
    pass "alternate secret groups"
  else
    fail "alternate secret groups should pass"
  fi
  printf '%s\n' BETA_ALLOWED_EMAILS APPLE_TEAM_ID APPLE_KEY_ID >"$present"
  if out="$(check_required_secrets "$spec" "$present" 2>&1)"; then
    fail "incomplete apple group should fail"
  else
    if [[ "$out" == *"APPLE_TEAM_ID+APPLE_KEY_ID+APPLE_PRIVATE_KEY|APPLE_CLIENT_SECRET"* && "$out" != *"SUPER_SECRET"* ]]; then
      pass "incomplete apple group names the requirement"
    else
      fail "incomplete apple group output: $out"
    fi
  fi

  local committed_present
  committed_present="$(mktemp)"
  cat >"$committed_present" <<'EOF'
BETTER_AUTH_SECRET
BETA_ALLOWED_EMAILS
ENCRYPTION_KEY
RESEND_API_KEY
EMAIL_FROM
SOUNDCLOUD_CLIENT_ID
SOUNDCLOUD_CLIENT_SECRET
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
APPLE_CLIENT_ID
APPLE_TEAM_ID
APPLE_KEY_ID
APPLE_PRIVATE_KEY
APPLE_MUSIC_TEAM_ID
APPLE_MUSIC_KEY_ID
APPLE_MUSIC_PRIVATE_KEY
EOF
  if check_required_secrets "$REQUIRED_SECRETS_FILE" "$committed_present"; then
    pass "committed required-secrets accepts the signing set"
  else
    fail "committed required-secrets rejected the signing set"
  fi
  printf '%s\n' APPLE_CLIENT_SECRET >"$committed_present"
  # Rebuild a static-token production set.
  cat >"$committed_present" <<'EOF'
BETTER_AUTH_SECRET
BETA_ALLOWED_EMAILS
ENCRYPTION_KEY
RESEND_API_KEY
EMAIL_FROM
SOUNDCLOUD_CLIENT_ID
SOUNDCLOUD_CLIENT_SECRET
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
APPLE_CLIENT_ID
APPLE_CLIENT_SECRET
APPLE_MUSIC_DEVELOPER_TOKEN
EOF
  if check_required_secrets "$REQUIRED_SECRETS_FILE" "$committed_present"; then
    pass "committed required-secrets accepts static token fallbacks"
  else
    fail "static token fallbacks should satisfy the committed list"
  fi
  if out="$(check_required_secrets "$REQUIRED_SECRETS_FILE" "$spec" 2>&1)"; then
    fail "tiny present-file should not satisfy the committed list"
  else
    if [[ "$out" == *"missing required secret: BETTER_AUTH_SECRET"* ]]; then
      pass "missing BETTER_AUTH_SECRET is reported by name"
    else
      fail "missing-name output: $out"
    fi
  fi
  printf '%s\n' '|APPLE_CLIENT_SECRET' >"$spec"
  printf '%s\n' APPLE_CLIENT_SECRET >"$present"
  if out="$(check_required_secrets "$spec" "$present" 2>&1)"; then
    fail "empty secret alternative should fail"
  else
    if [[ "$out" == *"empty name"* ]]; then
      pass "empty secret alternative fails closed"
    else
      fail "empty secret alternative output: $out"
    fi
  fi

  local json_out json_err
  json_out="$(mktemp)"
  json_err="$(mktemp)"
  if printf '%s\n' '[{"name":"BETA_ALLOWED_EMAILS","type":"secret_text","value":"SUPER_SECRET_DO_NOT_PRINT"}]' | secret_names_from_json >"$json_out" 2>"$json_err"; then
    if [[ "$(cat "$json_out")" == "BETA_ALLOWED_EMAILS" ]] && ! grep -q "SUPER_SECRET_DO_NOT_PRINT" "$json_out" "$json_err"; then
      pass "secret JSON emits names only"
    else
      fail "secret JSON leaked or parsed wrong"
    fi
  else
    fail "secret JSON should parse a name field"
  fi
  if printf '%s\n' 'not-json SUPER_SECRET_DO_NOT_PRINT' | secret_names_from_json >"$json_out" 2>"$json_err"; then
    fail "non-json secret list should fail"
  else
    if grep -q "refusing to print the response" "$json_err" && ! grep -q "SUPER_SECRET_DO_NOT_PRINT" "$json_out" "$json_err"; then
      pass "non-json secret list is not printed"
    else
      fail "non-json secret list printed payload or the wrong error"
    fi
  fi
  if printf '%s\n' 'wrangler: logged a warning' '[{"name":"BETA_ALLOWED_EMAILS","value":"SUPER_SECRET_DO_NOT_PRINT"}]' | secret_names_from_json >"$json_out" 2>"$json_err"; then
    if [[ "$(cat "$json_out")" == "BETA_ALLOWED_EMAILS" ]] && ! grep -q "SUPER_SECRET_DO_NOT_PRINT" "$json_out" "$json_err"; then
      pass "secret JSON ignores a log preamble"
    else
      fail "preamble secret JSON leaked or parsed wrong"
    fi
  else
    fail "secret JSON should parse an array after a log preamble"
  fi
  if printf '%s\n' '[wrangler] ready' '[{"name":"BETA_ALLOWED_EMAILS","value":"SUPER_SECRET_DO_NOT_PRINT"}]' | secret_names_from_json >"$json_out" 2>"$json_err"; then
    fail "a bracketed log line must not be parsed as the secret list"
  else
    if grep -q "refusing to print the response" "$json_err" && ! grep -q "SUPER_SECRET_DO_NOT_PRINT" "$json_out" "$json_err" && ! grep -q "BETA_ALLOWED_EMAILS" "$json_out"; then
      pass "bracketed log line fails without printing the payload"
    else
      fail "bracketed log line printed the payload or the wrong error"
    fi
  fi
  if printf '%s\n' '[{"name":"super-secret-do-not-print","value":"ALSO_DO_NOT_PRINT"}]' | secret_names_from_json >"$json_out" 2>"$json_err"; then
    fail "unexpected secret name should fail"
  else
    if grep -q "unexpected name" "$json_err" && ! grep -q "super-secret-do-not-print" "$json_out" "$json_err" && ! grep -q "ALSO_DO_NOT_PRINT" "$json_out" "$json_err"; then
      pass "unexpected secret name is not printed"
    else
      fail "unexpected secret name printed a name or value"
    fi
  fi

  local tmp wt sha dirty_err dirty_sha_err diverge_err
  tmp="$(mktemp -d)"
  dirty_err="$(mktemp)"
  dirty_sha_err="$(mktemp)"
  diverge_err="$(mktemp)"
  (
    set -euo pipefail
    cd "$tmp"
    wt=""
    trap 'if [[ -n "${wt:-}" ]]; then git worktree remove --force "$wt" >/dev/null 2>&1 || true; fi' EXIT
    git init -b main >/dev/null
    git config user.email deploy-selfcheck@example.com
    git config user.name deploy-selfcheck
    echo a >a.txt
    git add a.txt
    git commit -m init >/dev/null
    git update-ref refs/remotes/origin/main HEAD
    if ! resolve_deploy_sha >/dev/null; then
      printf '%s\n' "clean origin/main was refused" >&2
      exit 1
    fi
    echo dirty >dirty.txt
    if resolve_deploy_sha >/dev/null 2>"$dirty_err"; then
      printf '%s\n' "dirty tree was accepted" >&2
      exit 1
    fi
    grep -q "not empty" "$dirty_err"
    sha="$(git rev-parse HEAD)"
    if resolve_deploy_sha "$sha" >/dev/null 2>"$dirty_sha_err"; then
      printf '%s\n' "dirty tree with a sha was accepted" >&2
      exit 1
    fi
    grep -q "not empty" "$dirty_sha_err"
    git update-ref refs/remotes/origin/main HEAD~0
    # Move origin/main off HEAD without a second commit by using an empty tree parent.
    git commit --allow-empty -m second >/dev/null
    git update-ref refs/remotes/origin/main HEAD~1
    rm -f dirty.txt
    if resolve_deploy_sha >/dev/null 2>"$diverge_err"; then
      printf '%s\n' "diverged HEAD was accepted" >&2
      exit 1
    fi
    grep -q "not origin/main" "$diverge_err"
    if ! resolve_deploy_sha HEAD >/dev/null; then
      printf '%s\n' "clean tree with a sha was refused" >&2
      exit 1
    fi
    wt="$(create_deploy_worktree HEAD)"
    [[ "$(git -C "$wt" rev-parse HEAD)" == "$(git rev-parse HEAD)" ]]
    [[ "$(git -C "$wt" status --porcelain)" == "" ]]
    git worktree remove --force "$wt"
    [[ ! -d "$wt" ]]
  ) && pass "git guard and /tmp worktree" || fail "git guard and /tmp worktree"

  PROP_SEQ=()
  PROP_I=0
  prop_seq_fetch() {
    local value="${PROP_SEQ[$PROP_I]}"
    PROP_I=$((PROP_I + 1))
    printf '%s\n' "$value"
  }
  local prop_out
  prop_out="$(mktemp)"
  PROP_SEQ=("old.js" "old.js" "new.js" "new.js" "new.js")
  if propagation_loop "new.js" 30 0 3 prop_seq_fetch >"$prop_out"; then
    if [[ "$PROP_I" -eq 5 ]] && grep -q "propagation ok after 5 tries" "$prop_out" && grep -q "old.js" "$prop_out" && grep -q "hashes seen:" "$prop_out"; then
      pass "propagation accepts three consecutive hashes"
    else
      fail "propagation success output unexpected (i=$PROP_I)"
    fi
  else
    fail "propagation should succeed on three consecutive matches"
  fi
  PROP_SEQ=()
  local n
  for n in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do
    if [[ $((n % 2)) -eq 0 ]]; then
      PROP_SEQ+=("new.js")
    else
      PROP_SEQ+=("old.js")
    fi
  done
  PROP_I=0
  if propagation_loop "new.js" 30 0 3 prop_seq_fetch >"$prop_out"; then
    fail "alternating hashes should fail"
  else
    if [[ "$PROP_I" -eq 30 ]] && grep -q "propagation failed after 30 tries" "$prop_out" && grep -q "old.js" "$prop_out" && grep -q "new.js" "$prop_out"; then
      local hash_count
      hash_count="$(grep -Ec '^(old|new)\.js$|^\(none\)$' "$prop_out" || true)"
      if [[ "$hash_count" -eq 30 ]]; then
        pass "propagation exits 1 after 30 hashes"
      else
        fail "propagation printed ${hash_count} hashes, expected 30"
      fi
    else
      fail "propagation failure did not print the hashes (i=$PROP_I)"
    fi
  fi

  local smoke_tmp smoke_out
  smoke_tmp="$(mktemp)"
  printf '%s\n' "https://example.test/ 200" "https://example.test/missing 401" >"$smoke_tmp"
  fake_status() {
    if [[ "$1" == "https://example.test/" ]]; then
      printf '%s' "200"
    else
      printf '%s' "500"
    fi
  }
  if smoke_out="$(smoke_statuses "$smoke_tmp" fake_status 2>&1)"; then
    fail "smoke mismatch should fail"
  else
    if [[ "$smoke_out" == *"smoke ok: https://example.test/ 200"* && "$smoke_out" == *"expected 401 got 500"* && "$smoke_out" != *"SECRET_BODY"* ]]; then
      pass "smoke reports status only"
    else
      fail "smoke output: $smoke_out"
    fi
  fi
  printf '%s\n' 'https://example.test/ nope' >"$smoke_tmp"
  leak_status() {
    printf '%s' "SECRET_BODY"
  }
  if smoke_out="$(smoke_statuses "$smoke_tmp" leak_status 2>&1)"; then
    fail "bad smoke line should fail"
  else
    if [[ "$smoke_out" == *"bad smoke line"* && "$smoke_out" != *"SECRET_BODY"* ]]; then
      pass "bad smoke line fails before the request"
    else
      fail "bad smoke line output: $smoke_out"
    fi
  fi

  local headers
  headers="$(printf '%s\n' \
    'HTTP/1.1 200' \
    'strict-transport-security: max-age=1' \
    "content-security-policy: default-src 'self'" \
    'x-frame-options: DENY' \
    'x-content-type-options: nosniff' \
    'referrer-policy: no-referrer' \
    'permissions-policy: camera=()' \
    'set-cookie: SECRET_COOKIE=nope')"
  if out="$(security_headers_ok "$headers")"; then
    if [[ "$out" == *"security headers present"* && "$out" == *"x-frame-options: DENY"* && "$out" != *"SECRET_COOKIE"* ]]; then
      pass "security headers omit unrelated lines"
    else
      fail "security header output leaked or dropped a match"
    fi
  else
    fail "complete security headers should pass"
  fi
  if security_headers_ok $'strict-transport-security: 1\n' >/dev/null 2>&1; then
    fail "partial security headers should fail"
  else
    pass "partial security headers fail"
  fi

  local smoke_lines=()
  local smoke_line
  while IFS= read -r smoke_line || [[ -n "$smoke_line" ]]; do
    smoke_line="${smoke_line%%#*}"
    smoke_line="${smoke_line#"${smoke_line%%[![:space:]]*}"}"
    smoke_line="${smoke_line%"${smoke_line##*[![:space:]]}"}"
    [[ -z "$smoke_line" ]] && continue
    smoke_lines+=("$smoke_line")
  done <"$SMOKE_FILE"
  if [[ "${#smoke_lines[@]}" -eq 5 \
    && "${smoke_lines[0]}" == "https://ritmofit.studio/ 200" \
    && "${smoke_lines[1]}" == "https://ritmofit.studio/api/v1/health 200" \
    && "${smoke_lines[2]}" == "https://ritmofit.studio/api/v1/classes 401" \
    && "${smoke_lines[3]}" == "https://ritmofit.studio/api/v1/explore 401" \
    && "${smoke_lines[4]}" == "https://ritmofit.studio/api/v1/teams 401" ]]; then
    pass "fixed production smoke list"
  else
    fail "production-smoke.txt drifted"
  fi

  rm -f "$present" "$spec" "$committed_present" "$json_out" "$json_err" "$smoke_tmp" "$prop_out" \
    "$dirty_err" "$dirty_sha_err" "$diverge_err"
  rm -rf "$tmp"
  if [[ "$fails" -ne 0 ]]; then
    printf '%s\n' "self-check failed: ${fails}" >&2
    return 1
  fi
  printf '%s\n' "self-check passed"
}

main() {
  if [[ $# -gt 1 ]]; then
    usage >&2
    exit 2
  fi
  if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
  fi
  if [[ "${1:-}" == "--self-check" ]]; then
    self_check
    exit 0
  fi
  if [[ "${1:-}" == --* ]]; then
    usage >&2
    exit 2
  fi

  local repo sha nvmrc
  repo="$(git rev-parse --show-toplevel)"
  cd "$repo"
  git fetch origin main

  if [[ $# -eq 1 ]]; then
    sha="$(resolve_deploy_sha "$1")"
  else
    sha="$(resolve_deploy_sha)"
  fi

  nvmrc="$(git show "${sha}:.nvmrc")"
  assert_node_major "$nvmrc" "$(node -v)"
  deploy_tree "$sha"
}

main "$@"
