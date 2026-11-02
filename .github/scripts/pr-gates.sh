#!/usr/bin/env bash
# PR gate glue shared by .github/workflows/ci.yml (full run) and .github/workflows/owner-gate.yml
# (label-only run, RF-100). Policy: AGENTS.md › "Delegation And Merge Policy".
#
#   pr-gates.sh self-check   both workflows still agree on the names below
#   pr-gates.sh prepare      changed files + base branch's checkers into $RUNNER_TEMP
#   pr-gates.sh wait-for-ci  label run: wait for this head's full ci.yml run, require it passed
#   pr-gates.sh owner-gate   owner gate against the PR's live labels and this head's approval
#
# Every failure exits non-zero: an unreadable API answer never counts as a pass.
set -euo pipefail

# The ruleset's required check. Both workflows' gate jobs carry this exact name, so the newest
# check run on the head (full run or label run) is the one the ruleset reads.
REQUIRED_JOB='format · typecheck · lint · test · build · audit'
# ci.yml's step that passes only when every check before the owner gate passed.
MARKER_STEP='All checks except the owner gate passed'
APPROVAL_LABEL='owner-approved'
CI_WORKFLOW='ci.yml'

need() {
  for name in "$@"; do
    if [ -z "${!name:-}" ]; then
      echo "pr-gates: $name is required; refusing to pass blind." >&2
      exit 1
    fi
  done
}

self_check() {
  local dir='.github/workflows'
  grep -qxF "    name: $REQUIRED_JOB" "$dir/ci.yml" ||
    { echo "pr-gates: ci.yml's job is not named '$REQUIRED_JOB'." >&2; exit 1; }
  grep -qxF "    name: $REQUIRED_JOB" "$dir/owner-gate.yml" ||
    { echo "pr-gates: owner-gate.yml's job is not named '$REQUIRED_JOB'." >&2; exit 1; }
  grep -qxF "      - name: $MARKER_STEP" "$dir/ci.yml" ||
    { echo "pr-gates: ci.yml has no step named '$MARKER_STEP'." >&2; exit 1; }
  echo "pr-gates: both workflows use '$REQUIRED_JOB' and ci.yml has '$MARKER_STEP'."
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

# A label-only run re-runs nothing but the owner gate, so it may pass only when this exact head's
# newest full ci.yml run passed every check before the owner gate. It waits for a run still in
# progress, and fails when there is none or the newest one did not pass.
wait_for_ci() {
  need GH_TOKEN GITHUB_REPOSITORY HEAD_SHA
  local deadline=$((SECONDS + ${CI_WAIT_SECONDS:-2400}))
  local idle_deadline=$((SECONDS + ${CI_IDLE_SECONDS:-300}))
  local runs pending run=''
  while :; do
    runs=$(gh api "repos/$GITHUB_REPOSITORY/actions/workflows/$CI_WORKFLOW/runs?head_sha=$HEAD_SHA&event=pull_request&per_page=100" \
      --jq '[.workflow_runs[] | {id, status, conclusion, html_url, created_at}] | sort_by(.created_at) | reverse')
    pending=$(jq '[.[] | select(.status != "completed")] | length' <<< "$runs")
    if [ "$pending" -gt 0 ]; then
      echo "Waiting for $pending $CI_WORKFLOW run(s) on $HEAD_SHA to finish."
      [ "$SECONDS" -lt "$deadline" ] || { echo "Timed out waiting for $CI_WORKFLOW."; exit 1; }
    else
      # A cancelled run proves nothing; judge the newest run that finished.
      run=$(jq -c 'map(select(.conclusion != "cancelled")) | first // empty' <<< "$runs")
      [ -z "$run" ] || break
      echo "No finished $CI_WORKFLOW run on $HEAD_SHA yet."
      [ "$SECONDS" -lt "$idle_deadline" ] ||
        { echo "No full CI result for $HEAD_SHA; re-run $CI_WORKFLOW or push."; exit 1; }
    fi
    sleep 30
  done
  local id url result
  id=$(jq -r .id <<< "$run")
  url=$(jq -r .html_url <<< "$run")
  result=$(gh api "repos/$GITHUB_REPOSITORY/actions/runs/$id/jobs?per_page=100" |
    jq -r --arg job "$REQUIRED_JOB" --arg step "$MARKER_STEP" \
      '[.jobs[] | select(.name == $job) | .steps[]? | select(.name == $step) | .conclusion] | first // "missing"')
  if [ "$result" != success ]; then
    echo "Full CI on $HEAD_SHA did not pass ('$MARKER_STEP' is $result): $url"
    exit 1
  fi
  echo "Full CI on $HEAD_SHA passed every check before the owner gate: $url"
}

# Approval covers only the commit the owner saw: the label counts only while this exact head
# carries a successful `owner-approval` status. Labels are read live, so every run judges the
# labels as they are now, not as they were when its event fired.
owner_gate() {
  need GH_TOKEN GITHUB_REPOSITORY PR_NUMBER HEAD_SHA RUNNER_TEMP
  local labels bound=0 attempt
  labels=$(gh api "repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER" --jq '[.labels[].name]')
  for attempt in 1 2 3 4 5 6 7; do
    bound=$(gh api "repos/$GITHUB_REPOSITORY/commits/$HEAD_SHA/statuses" --paginate \
      --jq '[.[] | select(.context == "owner-approval" and .state == "success")] | length' |
      awk '{ total += $1 } END { print total + 0 }')
    [ "$bound" -eq 0 ] || break
    # A concurrent label run may still be recording the approval; give it a moment.
    jq -e --arg l "$APPROVAL_LABEL" 'index($l) != null' <<< "$labels" > /dev/null || break
    [ "$attempt" -lt 7 ] || break
    echo "'$APPROVAL_LABEL' is present but $HEAD_SHA has no owner-approval status yet; rechecking."
    sleep 10
  done
  if [ "$bound" -eq 0 ]; then
    echo "No owner-approval status on $HEAD_SHA; $APPROVAL_LABEL (if present) is not counted."
    labels=$(jq -c --arg l "$APPROVAL_LABEL" 'map(select(. != $l))' <<< "$labels")
  fi
  OWNER_GATE_LABELS="$labels" node "$RUNNER_TEMP/owner-gate.mjs" < "$RUNNER_TEMP/pr-files.txt"
}

case "${1:-}" in
  self-check) self_check ;;
  prepare) prepare ;;
  wait-for-ci) wait_for_ci ;;
  owner-gate) owner_gate ;;
  *)
    echo "usage: pr-gates.sh self-check|prepare|wait-for-ci|owner-gate" >&2
    exit 2
    ;;
esac
