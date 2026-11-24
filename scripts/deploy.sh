#!/usr/bin/env bash
set -euo pipefail

# Deploy the Cloudflare Worker that serves https://ritmofit.studio.
# See ritmofit_dev_plan/deployment-runbook.md.
#
#   scripts/deploy.sh              # clean tree whose HEAD is origin/main
#   scripts/deploy.sh <sha>        # clean tree; HEAD may differ from origin/main
#   scripts/deploy.sh --allow-batch [sha]  # owner said, in the session, to batch
#   scripts/deploy.sh --self-check # local guards only; does not deploy
#
# A dirty tree always refuses, including when a sha is passed. The sha only
# permits a HEAD that is not origin/main.
#
# Before building, the deploy-alone guard (scripts/release-status.mjs --guard)
# refuses a range from the newest deploy/* tag to the commit that mixes a
# deploy-alone change with other shipped changes, and prints the steps.
# --allow-batch lets it through; pass it only when the owner said to batch.
#
# The script checks out a detached worktree under /tmp and builds there.
# ritmofit_design_system has no lockfile and no dependencies: do not npm ci.
#
# After every post-deploy check passes, it tags the deployed commit
# deploy/<UTC YYYY-MM-DDTHHMMZ>-<sha7> and pushes only that tag. Exit 3 means
# the deploy stands but the tag did not reach origin; the script prints the
# command that pushes it.

PROPAGATION_TRIES=30
PROPAGATION_SLEEP_SECONDS=10
PROPAGATION_CONSECUTIVE=3
TAG_PUSH_TRIES=3
TAG_PUSH_SLEEP_SECONDS=5
# Exit status when the deploy went out but its tag was not created or pushed.
TAG_FAILED_EXIT=3

# Set by deploy_guard for the tag message.
DEPLOY_SINCE="none"
DEPLOY_BATCH=""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REQUIRED_SECRETS_FILE="${SCRIPT_DIR}/required-secrets.txt"
SMOKE_FILE="${SCRIPT_DIR}/production-smoke.txt"
RELEASE_STATUS="${SCRIPT_DIR}/release-status.mjs"

usage() {
  printf '%s\n' \
    "usage: scripts/deploy.sh [--allow-batch] [sha]" \
    "       scripts/deploy.sh --self-check" \
    "git status --porcelain must be empty. A dirty tree always refuses." \
    "With no sha, HEAD must equal origin/main. A sha deploys that commit anyway." \
    "--allow-batch lets a deploy-alone change ship with other changes; pass it only" \
    "when the owner said, in this session, to batch them, and record it in HISTORY."
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

# Runs the deploy-alone guard (scripts/release-status.mjs --guard) for sha in the
# current repo and prints its report. Sets DEPLOY_SINCE (the newest deploy tag,
# or "none") and DEPLOY_BATCH (set only for an --allow-batch batch) for the tag
# message. Returns 1 when the range must not ship as one deploy, or when the
# guard could not decide; nothing has been built or uploaded at that point.
deploy_guard() {
  local sha="$1"
  local allow="${2:-}"
  local out line status=0
  out="$(mktemp)"
  if [[ "$allow" == "allow" ]]; then
    node "$RELEASE_STATUS" --guard "$sha" --allow-batch >"$out" || status=$?
  else
    node "$RELEASE_STATUS" --guard "$sha" >"$out" || status=$?
  fi
  DEPLOY_SINCE="none"
  DEPLOY_BATCH=""
  while IFS= read -r line || [[ -n "$line" ]]; do
    printf '%s\n' "$line"
    case "$line" in
      "since: "*) DEPLOY_SINCE="${line#since: }" ;;
      "batch: "*) DEPLOY_BATCH="${line#batch: }" ;;
    esac
  done <"$out"
  rm -f "$out"
  if [[ "$status" -ne 0 ]]; then
    printf '%s\n' "deploy guard stopped the deploy (exit ${status}); nothing was built or uploaded" >&2
    return 1
  fi
}

# deploy_tag_name <40-hex sha> <UTC YYYY-MM-DDTHH:MM:SSZ>
# Prints deploy/<YYYY-MM-DDTHHMMZ>-<sha7>.
deploy_tag_name() {
  local sha="$1"
  local when="$2"
  local sha_re='^[0-9a-f]{40}$'
  local when_re='^([0-9]{4}-[0-9]{2}-[0-9]{2})T([0-9]{2}):([0-9]{2}):[0-9]{2}Z$'
  if [[ ! "$sha" =~ $sha_re ]]; then
    printf '%s\n' "deploy tag: not a full commit sha: ${sha}" >&2
    return 1
  fi
  if [[ ! "$when" =~ $when_re ]]; then
    printf '%s\n' "deploy tag: not a UTC time: ${when}" >&2
    return 1
  fi
  printf 'deploy/%sT%s%sZ-%s\n' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" "${BASH_REMATCH[3]}" \
    "${sha:0:7}"
}

# deploy_tag_message <sha> <deployed UTC> <worker version> <rollback version>
#   <SPA entry> <since tag> [batch]
deploy_tag_message() {
  printf '%s\n' \
    "deploy ${1:0:7} to production" \
    "" \
    "commit: ${1}" \
    "deployed: ${2}" \
    "worker version: ${3}" \
    "rollback version: ${4}" \
    "spa entry: ${5}" \
    "since: ${6}"
  if [[ -n "${7:-}" ]]; then
    printf '%s\n' "batch: ${7}"
  fi
}

# Prints the Worker version ID from the file wrangler deploy writes when
# WRANGLER_OUTPUT_FILE_PATH is set (one JSON object per line), or "unknown".
# Prints nothing else from the file.
worker_version_from_output() {
  node -e '
    const fs = require("fs");
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    let id = "unknown";
    let text = "";
    try {
      text = fs.readFileSync(process.argv[1], "utf8");
    } catch {}
    for (const line of text.split("\n")) {
      try {
        const entry = JSON.parse(line);
        if (entry && entry.type === "deploy" && uuid.test(entry.version_id)) id = entry.version_id;
      } catch {}
    }
    process.stdout.write(id + "\n");
  ' "$1"
}

# Prints the versions a captured `wrangler deployments status` named, as
# "<id> (<pct>%)" joined by ", ", or "unknown". Colour codes are ignored.
rollback_version_from_status() {
  node -e '
    const fs = require("fs");
    let text = "";
    try {
      text = fs.readFileSync(process.argv[1], "utf8");
    } catch {}
    text = text.replace(/\u001b\[[0-9;]*m/g, "");
    const re = /\((\d{1,3})%\)\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g;
    const found = [...text.matchAll(re)].map((m) => m[2] + " (" + m[1] + "%)");
    process.stdout.write((found.length ? found.join(", ") : "unknown") + "\n");
  ' "$1"
}

# tag_deploy <repo> <tag name> <sha> <message file>
# Creates the annotated deploy tag and pushes only that ref. The deploy has
# already happened, so a failure never undoes it: it says so, prints what to
# run, and returns TAG_FAILED_EXIT.
tag_deploy() {
  local repo="$1"
  local name="$2"
  local sha="$3"
  local msg="$4"
  local try
  if ! git -C "$repo" tag -a "$name" "$sha" -F "$msg"; then
    printf '%s\n' \
      "DEPLOYED ${sha:0:7}, but creating the deploy tag ${name} failed." \
      "The deploy stands; do not roll back for this. From the repo root, save the message below" \
      "to a file, then run:" \
      "  git tag -a ${name} ${sha} -F <that file> && git push origin refs/tags/${name}" \
      "and record the deploy in HISTORY as usual. Tag message:" >&2
    cat "$msg" >&2
    return "$TAG_FAILED_EXIT"
  fi
  printf '%s\n' "tagged ${sha:0:7} as ${name}"
  for ((try = 1; try <= TAG_PUSH_TRIES; try++)); do
    if git -C "$repo" push origin "refs/tags/${name}:refs/tags/${name}"; then
      printf '%s\n' "pushed ${name} to origin"
      return 0
    fi
    if [[ "$try" -lt "$TAG_PUSH_TRIES" && "$TAG_PUSH_SLEEP_SECONDS" != "0" ]]; then
      sleep "$TAG_PUSH_SLEEP_SECONDS"
    fi
  done
  printf '%s\n' \
    "DEPLOYED ${sha:0:7}, but pushing ${name} to origin failed ${TAG_PUSH_TRIES} times." \
    "The deploy stands; do not roll back for this. The tag exists locally. From the repo root:" \
    "  git push origin refs/tags/${name}" \
    "and record the deploy in HISTORY as usual." >&2
  return "$TAG_FAILED_EXIT"
}

deploy_tree() {
  local sha="$1"
  local short wt names_file mig_out expected count status_log rollback deploy_out deployed_at
  local worker tag_name msg_file tag_status=0
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
  status_log="$(mktemp)"
  pnpm --filter @ritmofit/api exec wrangler deployments status | tee "$status_log"
  rollback="$(rollback_version_from_status "$status_log")"
  rm -f "$status_log"
  printf '%s\n' "rollback version for the deploy tag: ${rollback}"

  run_gates
  pnpm --filter @ritmofit/web build

  expected="$(grep -oE -m 1 'assets/index-[A-Za-z0-9_-]+\.js' apps/web/dist/index.html || true)"
  if [[ -z "$expected" ]]; then
    printf '%s\n' "built index.html has no SPA entry hash" >&2
    exit 1
  fi
  printf '%s\n' "built entry: ${expected}"

  # wrangler appends one JSON object per line to this file, including the new
  # version ID. Reading it leaves the upload's own output and prompts as they are.
  deploy_out="$(mktemp)"
  WRANGLER_OUTPUT_FILE_PATH="$deploy_out" \
    pnpm --filter @ritmofit/api exec wrangler deploy --message "$short"
  deployed_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  worker="$(worker_version_from_output "$deploy_out")"
  rm -f "$deploy_out"
  printf '%s\n' "deployed Worker version: ${worker} at ${deployed_at}"
  if [[ "$worker" == "unknown" ]]; then
    printf '%s\n' "warning: could not read the new Worker version; the deploy tag will say unknown." \
      "Read it with wrangler deployments status and put it in HISTORY." >&2
  fi

  propagation_loop "$expected" "$PROPAGATION_TRIES" "$PROPAGATION_SLEEP_SECONDS" \
    "$PROPAGATION_CONSECUTIVE" fetch_entry_hash
  smoke_statuses "$SMOKE_FILE"
  security_headers_ok "$(fetch_security_headers)"

  # Every post-deploy check passed: record what production now runs.
  msg_file="$(mktemp)"
  deploy_tag_message "$sha" "$deployed_at" "$worker" "$rollback" "$expected" "$DEPLOY_SINCE" \
    "$DEPLOY_BATCH" >"$msg_file"
  if tag_name="$(deploy_tag_name "$sha" "$deployed_at")"; then
    tag_deploy "$DEPLOY_REPO" "$tag_name" "$sha" "$msg_file" || tag_status=$?
  else
    printf '%s\n' "DEPLOYED ${short}, but no deploy tag name could be built. The deploy stands." \
      "Tag message:" >&2
    cat "$msg_file" >&2
    tag_status="$TAG_FAILED_EXIT"
  fi
  rm -f "$msg_file"
  if [[ "$tag_status" -ne 0 ]]; then
    exit "$tag_status"
  fi
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

  # Deploy tag and deploy-alone guard (RF-244), against throwaway repos only.
  local sha40 tagname tagmsg batchmsg
  sha40="1eed288b3759dde832e775687eed5e83c3b4ca1d"
  tagmsg="$(deploy_tag_message "$sha40" 2026-11-24T02:37:16Z \
    515bc8fb-24fd-4ff7-b8be-6f7c28aa1e85 "fedc7fbf-1bc2-46cd-a90a-3059505e0a7b (100%)" \
    assets/index-CFKeSijz.js deploy/2026-11-23T1730Z-b9e8141 "")"
  batchmsg="$(deploy_tag_message "$sha40" 2026-11-24T02:37:16Z w r e s \
    "allowed by --allow-batch (#789 with #790)")"
  if tagname="$(deploy_tag_name "$sha40" 2026-11-24T02:37:16Z)" \
    && [[ "$tagname" == "deploy/2026-11-24T0237Z-1eed288" ]] \
    && ! deploy_tag_name 1eed288 2026-11-24T02:37:16Z >/dev/null 2>&1 \
    && ! deploy_tag_name "$sha40" "2026-11-24 02:37" >/dev/null 2>&1 \
    && [[ "$tagmsg" == "deploy 1eed288 to production"$'\n\n'"commit: ${sha40}"* ]] \
    && [[ "$tagmsg" == *$'\n'"deployed: 2026-11-24T02:37:16Z"$'\n'* ]] \
    && [[ "$tagmsg" == *$'\n'"worker version: 515bc8fb-24fd-4ff7-b8be-6f7c28aa1e85"$'\n'* ]] \
    && [[ "$tagmsg" == *$'\n'"rollback version: fedc7fbf-1bc2-46cd-a90a-3059505e0a7b (100%)"$'\n'* ]] \
    && [[ "$tagmsg" == *$'\n'"spa entry: assets/index-CFKeSijz.js"$'\n'* ]] \
    && [[ "$tagmsg" == *$'\n'"since: deploy/2026-11-23T1730Z-b9e8141" ]] \
    && [[ "$tagmsg" != *"batch:"* ]] \
    && [[ "$batchmsg" == *$'\n'"batch: allowed by --allow-batch (#789 with #790)" ]]; then
    pass "deploy tag name and message"
  else
    fail "deploy tag name or message: ${tagname:-} / ${tagmsg}"
  fi

  local vfile
  vfile="$(mktemp)"
  printf '%s\n' '{"type":"wrangler-session","version":1}' \
    '{"type":"deploy","version":1,"worker_name":"ritmofit-api","version_id":"515bc8fb-24fd-4ff7-b8be-6f7c28aa1e85","targets":["ritmofit.studio"]}' \
    >"$vfile"
  out="$(worker_version_from_output "$vfile")"
  printf '%s\n' 'not json' '{"type":"deploy","version_id":"SUPER_SECRET_DO_NOT_PRINT"}' >"$vfile"
  local out_bad out_missing status_one status_split status_none
  out_bad="$(worker_version_from_output "$vfile")"
  out_missing="$(worker_version_from_output "${vfile}.missing")"
  printf 'Created:  2026-11-23T17:30:46.000Z\nSource:  Upload\nVersion(s):  \033[36m(100%%)\033[39m fedc7fbf-1bc2-46cd-a90a-3059505e0a7b\n      Created:  2026-11-23T17:30:46.000Z\n' >"$vfile"
  status_one="$(rollback_version_from_status "$vfile")"
  printf '%s\n' 'Version(s):  (60%) aaaaaaaa-1111-2222-3333-444444444444' '' \
    '             (40%) bbbbbbbb-1111-2222-3333-444444444444' >"$vfile"
  status_split="$(rollback_version_from_status "$vfile")"
  printf '%s\n' 'wrangler: not authenticated' >"$vfile"
  status_none="$(rollback_version_from_status "$vfile")"
  rm -f "$vfile"
  if [[ "$out" == "515bc8fb-24fd-4ff7-b8be-6f7c28aa1e85" && "$out_bad" == "unknown" \
    && "$out_missing" == "unknown" \
    && "$status_one" == "fedc7fbf-1bc2-46cd-a90a-3059505e0a7b (100%)" \
    && "$status_split" == "aaaaaaaa-1111-2222-3333-444444444444 (60%), bbbbbbbb-1111-2222-3333-444444444444 (40%)" \
    && "$status_none" == "unknown" ]]; then
    pass "Worker and rollback versions for the tag message"
  else
    fail "version parsing: $out / $out_bad / $out_missing / $status_one / $status_split / $status_none"
  fi

  # A fixture main: #786 (deployed and tagged), docs, #789 (provider / playback,
  # deploys alone), #790 (an ordinary screen change), #793 (tests only).
  local gtmp gorigin gout gerr gmsg g_base g_alone g_tip gname gname2 gstatus
  gtmp="$(mktemp -d)"
  gorigin="$(mktemp -d)"
  gout="$(mktemp)"
  gerr="$(mktemp)"
  gmsg="$(mktemp)"
  fixture_commit() {
    local subject="$1"
    local f
    shift
    for f in "$@"; do
      mkdir -p "${gtmp}/$(dirname "$f")"
      printf '%s\n' "$subject" >>"${gtmp}/${f}"
    done
    git -C "$gtmp" add -A
    git -C "$gtmp" commit -q -m "$subject"
    git -C "$gtmp" rev-parse HEAD
  }
  git -C "$gtmp" init -q -b main
  git -C "$gtmp" config user.email deploy-selfcheck@example.com
  git -C "$gtmp" config user.name deploy-selfcheck
  git -C "$gtmp" config commit.gpgSign false
  git -C "$gtmp" config tag.gpgSign false
  g_base="$(fixture_commit 'fix(web): one button radius (#786)' apps/web/src/components/Button.tsx)"

  if (cd "$gtmp" && deploy_guard "$g_base" && printf 'SINCE=%s\n' "$DEPLOY_SINCE") \
    >"$gout" 2>"$gerr" && grep -q "no deploy/\* tag yet" "$gout" && grep -qx "SINCE=none" "$gout"; then
    pass "deploy guard warns and skips with no deploy tag"
  else
    fail "no-tag guard: $(cat "$gout" "$gerr")"
  fi

  git -C "$gtmp" tag -a "deploy/2026-11-23T1730Z-${g_base:0:7}" -m "deploy ${g_base:0:7}" "$g_base"
  fixture_commit 'docs: record a deploy (#788)' ritmofit_dev_plan/HISTORY.md >/dev/null
  g_alone="$(fixture_commit 'feat(web): Live names the next song (#789)' \
    apps/web/src/components/LiveMode.tsx apps/web/src/components/LiveMode.test.tsx)"
  fixture_commit 'feat(web): likes past 200 (#790)' apps/web/src/components/TrackSearch.tsx >/dev/null
  g_tip="$(fixture_commit 'test(web): likes in pick mode (#793)' \
    apps/web/src/components/Dashboard.test.tsx e2e/smoke.spec.ts)"

  if (cd "$gtmp" && deploy_guard "$g_alone" && printf 'SINCE=%s\nBATCH=%s\n' "$DEPLOY_SINCE" "$DEPLOY_BATCH") \
    >"$gout" 2>"$gerr" && grep -q "deploy guard: ok, 1 shipped change" "$gout" \
    && grep -qx "SINCE=deploy/2026-11-23T1730Z-${g_base:0:7}" "$gout" && grep -qx "BATCH=" "$gout"; then
    pass "deploy guard lets a deploy-alone change ship alone"
  else
    fail "deploy-alone change alone: $(cat "$gout" "$gerr")"
  fi

  if (cd "$gtmp" && deploy_guard "$g_tip") >"$gout" 2>"$gerr"; then
    fail "a deploy-alone change batched with another shipped change should be refused"
  elif grep -q "refusing to deploy ${g_tip:0:7}" "$gerr" \
    && grep -q "#789 ${g_alone:0:7} deploys alone (provider / playback)" "$gerr" \
    && grep -q "also shipped: #790" "$gerr" \
    && grep -q "1\. scripts/deploy.sh ${g_alone:0:7} .*#789 alone (provider / playback)" "$gerr" \
    && grep -q "2\. scripts/deploy.sh ${g_tip:0:7} .*#790" "$gerr" \
    && grep -q "nothing was built or uploaded" "$gerr"; then
    pass "deploy guard refuses a deploy-alone batch and prints the steps"
  else
    fail "batch refusal output: $(cat "$gout" "$gerr")"
  fi

  if (cd "$gtmp" && deploy_guard "$g_tip" allow && printf 'BATCH=%s\n' "$DEPLOY_BATCH") \
    >"$gout" 2>"$gerr" && grep -q "batching under --allow-batch" "$gout" \
    && grep -qx "BATCH=allowed by --allow-batch (#789 with #790)" "$gout"; then
    pass "deploy guard --allow-batch records the batch"
  else
    fail "--allow-batch: $(cat "$gout" "$gerr")"
  fi

  git init -q --bare "${gorigin}/origin.git"
  git -C "$gtmp" remote add origin "${gorigin}/origin.git"
  git -C "$gtmp" tag not-a-deploy-tag "$g_base"
  gname="deploy/2026-11-24T0237Z-${g_tip:0:7}"
  deploy_tag_message "$g_tip" 2026-11-24T02:37:16Z 515bc8fb-24fd-4ff7-b8be-6f7c28aa1e85 \
    "fedc7fbf-1bc2-46cd-a90a-3059505e0a7b (100%)" assets/index-CFKeSijz.js \
    "deploy/2026-11-23T1730Z-${g_base:0:7}" "" >"$gmsg"
  TAG_PUSH_SLEEP_SECONDS=0
  if tag_deploy "$gtmp" "$gname" "$g_tip" "$gmsg" >"$gout" 2>"$gerr" \
    && [[ "$(git -C "${gorigin}/origin.git" for-each-ref --format='%(refname)')" == "refs/tags/${gname}" ]] \
    && [[ "$(git -C "${gorigin}/origin.git" cat-file -t "refs/tags/${gname}")" == "tag" ]] \
    && [[ "$(git -C "${gorigin}/origin.git" rev-parse "refs/tags/${gname}^{commit}")" == "$g_tip" ]] \
    && git -C "${gorigin}/origin.git" cat-file -p "refs/tags/${gname}" \
      | grep -qx "worker version: 515bc8fb-24fd-4ff7-b8be-6f7c28aa1e85" \
    && grep -q "pushed ${gname} to origin" "$gout"; then
    pass "deploy tag pushes only its own ref"
  else
    fail "tag push: $(cat "$gout" "$gerr")"
  fi

  git -C "$gtmp" remote set-url origin "${gorigin}/missing.git"
  gname2="deploy/2026-11-24T0238Z-${g_tip:0:7}"
  gstatus=0
  tag_deploy "$gtmp" "$gname2" "$g_tip" "$gmsg" >"$gout" 2>"$gerr" || gstatus=$?
  if [[ "$gstatus" -eq "$TAG_FAILED_EXIT" ]] \
    && git -C "$gtmp" rev-parse -q --verify "refs/tags/${gname2}" >/dev/null \
    && grep -q "DEPLOYED ${g_tip:0:7}, but pushing ${gname2} to origin failed 3 times" "$gerr" \
    && grep -q "do not roll back" "$gerr" \
    && grep -q "git push origin refs/tags/${gname2}" "$gerr"; then
    pass "failed tag push keeps the local tag and exits 3"
  else
    fail "failed tag push (status ${gstatus}): $(cat "$gout" "$gerr")"
  fi

  gstatus=0
  tag_deploy "$gtmp" "$gname" "$g_tip" "$gmsg" >"$gout" 2>"$gerr" || gstatus=$?
  if [[ "$gstatus" -eq "$TAG_FAILED_EXIT" ]] && grep -q "creating the deploy tag ${gname} failed" "$gerr" \
    && grep -q "worker version: 515bc8fb" "$gerr"; then
    pass "failed tag creation prints the message and exits 3"
  else
    fail "failed tag creation (status ${gstatus}): $(cat "$gout" "$gerr")"
  fi
  rm -rf "$gtmp" "$gorigin"
  rm -f "$gout" "$gerr" "$gmsg"

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
  local allow_batch="" target="" arg
  if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
  fi
  if [[ "${1:-}" == "--self-check" ]]; then
    if [[ $# -ne 1 ]]; then
      usage >&2
      exit 2
    fi
    self_check
    exit 0
  fi
  for arg in "$@"; do
    case "$arg" in
      --allow-batch)
        allow_batch="allow"
        ;;
      -*)
        usage >&2
        exit 2
        ;;
      *)
        if [[ -n "$target" ]]; then
          usage >&2
          exit 2
        fi
        target="$arg"
        ;;
    esac
  done

  local repo sha nvmrc
  repo="$(git rev-parse --show-toplevel)"
  cd "$repo"
  # Tags too: the newest deploy/* tag is where the deploy-alone guard starts.
  git fetch origin main --tags

  if [[ -n "$target" ]]; then
    sha="$(resolve_deploy_sha "$target")"
  else
    sha="$(resolve_deploy_sha)"
  fi

  nvmrc="$(git show "${sha}:.nvmrc")"
  assert_node_major "$nvmrc" "$(node -v)"
  deploy_guard "$sha" "$allow_batch"
  deploy_tree "$sha"
}

main "$@"
