#!/usr/bin/env bash
# PR gate glue shared by .github/workflows/ci.yml (every PR run) and
# .github/workflows/owner-gate.yml (label changes, RF-100). Policy: AGENTS.md › "Delegation And
# Merge Policy".
#
#   pr-gates.sh self-check     both workflows still agree on the names below
#   pr-gates.sh prepare        changed files + base branch's checkers into $RUNNER_TEMP
#   pr-gates.sh void-approval  drop a stale owner-approved label from the PR's live head
#   pr-gates.sh gate-status    evaluate the owner gate on the live head, write the owner-gate status
#
# The owner gate's result is the `owner-gate` commit status, not a check run: statuses with one
# context are latest-wins on a commit, while the ruleset reads every check suite's run of a
# required check, so a stale failed run could never be replaced. Every error exits non-zero: an
# unreadable API answer never counts as a pass.
set -euo pipefail

# The ruleset's required check: ci.yml's job, which never fails because of the owner gate.
REQUIRED_JOB='format · typecheck · lint · test · build · audit'
# The ruleset's required status, written by both workflows' gate jobs.
STATUS_CONTEXT='owner-gate'
# Both gate jobs share this concurrency group, so they write the status one at a time.
GATE_GROUP='owner-gate-pr-${{ github.event.pull_request.number }}'
APPROVAL_LABEL='owner-approved'

need() {
  for name in "$@"; do
    if [ -z "${!name:-}" ]; then
      echo "pr-gates: $name is required; refusing to pass blind." >&2
      exit 1
    fi
  done
}

self_check() {
  local dir='.github/workflows' wf
  grep -qxF "    name: $REQUIRED_JOB" "$dir/ci.yml" ||
    { echo "pr-gates: ci.yml's job is not named '$REQUIRED_JOB'." >&2; exit 1; }
  ! grep -qF "name: $REQUIRED_JOB" "$dir/owner-gate.yml" ||
    { echo "pr-gates: owner-gate.yml must not reuse the required check name." >&2; exit 1; }
  for wf in ci.yml owner-gate.yml; do
    grep -qxF "      group: $GATE_GROUP" "$dir/$wf" ||
      { echo "pr-gates: $wf's gate job is not in concurrency group '$GATE_GROUP'." >&2; exit 1; }
    grep -qF -- "-f context=$STATUS_CONTEXT " "$dir/$wf" ||
      { echo "pr-gates: $wf's error step does not write '$STATUS_CONTEXT'." >&2; exit 1; }
  done
  echo "pr-gates: ci.yml's job is '$REQUIRED_JOB'; both gate jobs share '$GATE_GROUP' and write '$STATUS_CONTEXT'."
}

# Changed files come from the PR files API, which lists a rename's old path too and handles diffs
# too large for `gh pr diff`. The gates run the base branch's copy of each checker when it has
# one, so a PR cannot loosen the checker that judges it.
prepare() {
  need GH_TOKEN GITHUB_REPOSITORY PR_NUMBER BASE_REF RUNNER_TEMP
  gh api "repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER/files" --paginate \
    --jq '.[] | [.filename, (.previous_filename // "")] | @tsv' > "$RUNNER_TEMP/pr-files.tsv"
  # The files API stops at 3,000 files. Fail closed rather than gate a truncated list.
  local expected listed
  expected=$(gh api "repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER" --jq .changed_files)
  listed=$(grep -c . "$RUNNER_TEMP/pr-files.tsv" || true)
  if [ "$listed" -ne "$expected" ]; then
    echo "PR has $expected changed files but the API listed $listed; refusing to gate a partial list."
    exit 1
  fi
  tr '\t' '\n' < "$RUNNER_TEMP/pr-files.tsv" | grep . | sort -u > "$RUNNER_TEMP/pr-files.txt"
  echo "$listed changed files, $(wc -l < "$RUNNER_TEMP/pr-files.txt") paths including renames' old paths"
  git fetch --no-tags --depth=1 origin "$BASE_REF"
  for checker in owner-gate rf-trace; do
    if git cat-file -e "FETCH_HEAD:scripts/$checker.mjs" 2>/dev/null; then
      git show "FETCH_HEAD:scripts/$checker.mjs" > "$RUNNER_TEMP/$checker.mjs"
      echo "$checker: using $BASE_REF's copy"
    else
      cp "scripts/$checker.mjs" "$RUNNER_TEMP/$checker.mjs"
      echo "$checker: not on $BASE_REF yet, using this PR's copy"
    fi
  done
}

# Successful `owner-approval` statuses on a commit (owner-gate.yml records them). Assign the result
# before testing it, so an API failure stops the caller instead of reading as zero.
approvals() {
  gh api "repos/$GITHUB_REPOSITORY/commits/$1/statuses" --paginate \
    --jq '[.[] | select(.context == "owner-approval" and .state == "success")] | length' |
    awk '{ total += $1 } END { print total + 0 }'
}

# Hygiene after new commits: the label counts only with an approval on the head, so drop it when
# the live head has none. Live labels and head, not the push event's copy: an owner who already
# approved the new head keeps the label.
void_approval() {
  need GH_TOKEN GITHUB_REPOSITORY PR_NUMBER
  local pr head bound
  pr=$(gh api "repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER")
  head=$(jq -r .head.sha <<< "$pr")
  if ! jq -e --arg l "$APPROVAL_LABEL" '[.labels[].name] | index($l) != null' <<< "$pr" > /dev/null; then
    echo "No '$APPROVAL_LABEL' label on PR #$PR_NUMBER."
    return
  fi
  bound=$(approvals "$head")
  if [ "$bound" -gt 0 ]; then
    echo "Keeping '$APPROVAL_LABEL': the owner approved the current head $head."
    return
  fi
  gh api -X DELETE "repos/$GITHUB_REPOSITORY/issues/$PR_NUMBER/labels/$APPROVAL_LABEL" > /dev/null
  echo "Removed '$APPROVAL_LABEL': $head has no owner approval."
}

# Approval covers only the commit the owner saw: the label counts only while this exact head
# carries a successful `owner-approval` status. Labels are read live. No retry for an approval
# still being recorded: owner-gate.yml runs its gate job after recording, in the same concurrency
# group, so a later write sees it.
owner_gate() {
  need GH_TOKEN GITHUB_REPOSITORY PR_NUMBER HEAD_SHA RUNNER_TEMP
  local labels bound
  labels=$(gh api "repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER" --jq '[.labels[].name]')
  bound=$(approvals "$HEAD_SHA")
  if [ "$bound" -eq 0 ]; then
    echo "No owner-approval status on $HEAD_SHA; $APPROVAL_LABEL (if present) is not counted."
    labels=$(jq -c --arg l "$APPROVAL_LABEL" 'map(select(. != $l))' <<< "$labels")
  fi
  OWNER_GATE_LABELS="$labels" node "$RUNNER_TEMP/owner-gate.mjs" < "$RUNNER_TEMP/pr-files.txt"
}

# Judges the PR's live head, not the event's: gate jobs run one at a time and each reads the
# head, files, labels and approvals as they are now, so the last write matches the PR. A gate
# result (pass or owner-gated without approval) exits 0; an error exits non-zero and the
# workflow's error step writes failure.
gate_status() {
  need GH_TOKEN GITHUB_REPOSITORY PR_NUMBER RUNNER_TEMP
  local head log rc state description
  head=$(gh api "repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER" --jq .head.sha)
  [ -n "$head" ] || { echo "pr-gates: no head SHA for PR #$PR_NUMBER." >&2; exit 1; }
  log="$RUNNER_TEMP/owner-gate.log"
  set +e
  (set -e; prepare; HEAD_SHA="$head" owner_gate) 2>&1 | tee "$log"
  rc=${PIPESTATUS[0]}
  set -e
  if [ "$rc" -eq 0 ] && grep -q 'none owner-gated' "$log"; then
    state=success description='No owner-gated paths changed'
  elif [ "$rc" -eq 0 ]; then
    state=success description="Owner-gated paths; owner-approved on ${head:0:7}"
  elif grep -q 'owner-gate: FAIL' "$log"; then
    state=failure description="Owner-gated paths need owner-approved on ${head:0:7}"
  else
    echo "pr-gates: the owner gate could not evaluate $head." >&2
    exit 1
  fi
  gh api "repos/$GITHUB_REPOSITORY/statuses/$head" -f state="$state" -f context="$STATUS_CONTEXT" \
    -f description="$description" \
    -f target_url="$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID" > /dev/null
  echo "$STATUS_CONTEXT on $head: $state ($description)"
}

case "${1:-}" in
  self-check) self_check ;;
  prepare) prepare ;;
  void-approval) void_approval ;;
  gate-status) gate_status ;;
  *)
    echo "usage: pr-gates.sh self-check|prepare|void-approval|gate-status" >&2
    exit 2
    ;;
esac
