#!/usr/bin/env bash
# PR gate glue for .github/workflows/owner-gate.yml (every PR event, RF-100 and RF-176) and
# .github/workflows/ci.yml (prepare and self-check). Policy: AGENTS.md › "Delegation And Merge
# Policy".
#
#   pr-gates.sh self-check       both workflows still agree on the names below
#   pr-gates.sh prepare          changed files + base branch's checkers into $RUNNER_TEMP
#   pr-gates.sh record-approval  record the owner's approval on the labelled head, or refuse
#   pr-gates.sh void-approval    drop a stale owner-approved label from the PR's live head
#   pr-gates.sh gate-status      evaluate the owner gate on the live head, write the owner-gate status
#   pr-gates.sh gate-error [msg] write owner-gate = failure on the live head (fail closed)
#
# The owner gate's result is the `owner-gate` commit status, not a check run: statuses with one
# context are latest-wins on a commit, while the ruleset reads every check suite's run of a
# required check, so a stale failed run could never be replaced. Every error exits non-zero: an
# unreadable API answer never counts as a pass.
set -euo pipefail

# The ruleset's required check: ci.yml's job, which never fails because of the owner gate.
REQUIRED_JOB='format · typecheck · lint · test · build · audit'
# The ruleset's required status. Only owner-gate.yml writes it (RF-176).
STATUS_CONTEXT='owner-gate'
# Every gate job runs in this concurrency group, so they write the status one at a time.
GATE_GROUP='owner-gate-pr-${{ github.event.pull_request.number }}'
APPROVAL_LABEL='owner-approved'
APPROVAL_CONTEXT='owner-approval'
# A head must have been the branch tip this long before owner-approved can bind to it (RF-176).
APPROVAL_SETTLE_SECONDS=120

need() {
  for name in "$@"; do
    if [ -z "${!name:-}" ]; then
      echo "pr-gates: $name is required; refusing to pass blind." >&2
      exit 1
    fi
  done
}

self_check() {
  local dir='.github/workflows' sub
  grep -qxF "    name: $REQUIRED_JOB" "$dir/ci.yml" ||
    { echo "pr-gates: ci.yml's job is not named '$REQUIRED_JOB'." >&2; exit 1; }
  ! grep -qF "name: $REQUIRED_JOB" "$dir/owner-gate.yml" ||
    { echo "pr-gates: owner-gate.yml must not reuse the required check name." >&2; exit 1; }
  # A gate job inside ci.yml's run could be replaced by a label event's job in the shared group,
  # and the CI run would then conclude "cancelled" (RF-176). Only owner-gate.yml writes statuses.
  ! grep -qF 'statuses: write' "$dir/ci.yml" ||
    { echo "pr-gates: ci.yml must not write commit statuses; owner-gate.yml owns '$STATUS_CONTEXT'." >&2; exit 1; }
  grep -qxF "      group: $GATE_GROUP" "$dir/owner-gate.yml" ||
    { echo "pr-gates: owner-gate.yml's gate job is not in concurrency group '$GATE_GROUP'." >&2; exit 1; }
  for sub in gate-status gate-error; do
    grep -qF "pr-gates.sh $sub" "$dir/owner-gate.yml" ||
      { echo "pr-gates: owner-gate.yml does not run '$sub'." >&2; exit 1; }
  done
  echo "pr-gates: ci.yml's job is '$REQUIRED_JOB'; owner-gate.yml alone writes '$STATUS_CONTEXT' in '$GATE_GROUP'."
}

# The PR as the API sees it now. gate-status fetches it once and passes it on as PR_JSON.
pr_json() {
  if [ -n "${PR_JSON:-}" ]; then
    printf '%s\n' "$PR_JSON"
  else
    gh api "repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER"
  fi
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
  expected=$(pr_json | jq -r .changed_files)
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

# Successful `owner-approval` statuses on a commit (record-approval writes them). Assign the
# result before testing it, so an API failure stops the caller instead of reading as zero.
approvals() {
  gh api "repos/$GITHUB_REPOSITORY/commits/$1/statuses" --paginate \
    --jq "[.[] | select(.context == \"$APPROVAL_CONTEXT\" and .state == \"success\")] | length" |
    awk '{ total += $1 } END { print total + 0 }'
}

# A just-written push or label event can take a moment to appear in the activity and timeline
# APIs. Lookups that may lag retry RETRIES times, RETRY_DELAY seconds apart (tests set 0).
RETRIES=4
RETRY_DELAY=${PR_GATES_RETRY_DELAY:-5}
# A run is created seconds after its event; a label event further back is not this run's.
EVENT_MATCH_SECONDS=60

# Runs "$@" until it prints something, at most RETRIES times, and prints that answer (or nothing).
retry_until_known() {
  local i out
  for ((i = 1; i <= RETRIES; i++)); do
    out=$("$@")
    if [ -n "$out" ]; then
      printf '%s\n' "$out"
      return 0
    fi
    if [ "$i" -lt "$RETRIES" ]; then sleep "$RETRY_DELAY"; fi
  done
  return 0
}

# Epoch seconds of the latest push that made $2 the tip of the PR's branch ($1 is the PR JSON),
# at or before $3 when given, from the repository activity API: the time GitHub received the
# push, which a commit's own dates cannot tell. Empty when unknown (a fork's branch, or no listed
# push); callers decide which way an unknown time fails.
pushed_at() {
  local repo ref before=${3:-}
  repo=$(jq -r '.head.repo.full_name // ""' <<< "$1")
  ref=$(jq -r '.head.ref // ""' <<< "$1")
  [ "$repo" = "$GITHUB_REPOSITORY" ] && [ -n "$ref" ] || return 0
  gh api -X GET "repos/$GITHUB_REPOSITORY/activity" -f ref="refs/heads/$ref" -f per_page=100 \
    --jq "[.[] | select(.after == \"$2\") | .timestamp | fromdateiso8601
      | select(\"$before\" == \"\" or . <= (\"${before:-0}\" | tonumber))] | max // empty"
}

# The PR's owner-approved add/remove events in timeline order, one "<epoch s> labeled|unlabeled"
# line each.
label_events() {
  gh api "repos/$GITHUB_REPOSITORY/issues/$PR_NUMBER/timeline" --paginate \
    --jq ".[] | select((.event == \"labeled\" or .event == \"unlabeled\")
      and .label.name == \"$APPROVAL_LABEL\") | \"\(.created_at | fromdateiso8601) \(.event)\""
}

# Epoch seconds of the owner-approved add that started this run: the newest add at most
# EVENT_MATCH_SECONDS before the run was created ($1). An older add is not this run's event, so
# a lagging timeline answers nothing rather than an older time.
label_time_for_run() {
  label_events | awk -v c="$1" -v w="$EVENT_MATCH_SECONDS" \
    '$2 == "labeled" && $1 <= c && c - $1 <= w { t = $1 } END { if (t != "") print t }'
}

write_status() {
  gh api "repos/$GITHUB_REPOSITORY/statuses/$1" -f state="$2" -f context="$STATUS_CONTEXT" \
    -f description="$3" \
    -f target_url="$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID" > /dev/null
  echo "$STATUS_CONTEXT on $1: $2 ($3)"
}

# Approval covers only the commit the owner saw, so it binds to the head in the label event. A
# push that lands seconds before the owner labels would bind the approval to a commit the owner
# never saw (the page was loaded before the push). The label time is this run's own event (not
# the newest add, which a lagging timeline may not show yet); the push time is the latest push
# of that head at or before the label, so the age is never negative. Refuse when that push came
# less than APPROVAL_SETTLE_SECONDS before the label, or when either time stays unknown after
# retries: the owner reviews the head, then removes and re-adds the label. The refusal message is
# the job's `refusal` output, which the gate job writes as the owner-gate description; any other
# failure here reads as a transient recording failure. Residual risk: a page left open longer
# than the window across a push; GitHub's live "new commits" banner is the owner's cue there.
record_approval() {
  need GH_TOKEN GITHUB_REPOSITORY PR_NUMBER HEAD_SHA GITHUB_OUTPUT GITHUB_RUN_ID
  local pr created labeled pushed age short=${HEAD_SHA:0:7}
  pr=$(pr_json)
  # A re-run keeps its run's created_at, so it still matches the same label event.
  created=$(gh api "repos/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID" \
    --jq '.created_at | fromdateiso8601')
  labeled=$(retry_until_known label_time_for_run "$created")
  if [ -z "$labeled" ]; then
    refuse_approval "Could not read when $APPROVAL_LABEL was added; remove and re-add it"
  fi
  pushed=$(retry_until_known pushed_at "$pr" "$HEAD_SHA" "$labeled")
  if [ -z "$pushed" ]; then
    refuse_approval "Could not read when $short was pushed; remove and re-add $APPROVAL_LABEL"
  fi
  age=$((labeled - pushed))
  if [ "$age" -lt "$APPROVAL_SETTLE_SECONDS" ]; then
    refuse_approval "$short was pushed ${age}s before $APPROVAL_LABEL; review it, then remove and re-add the label"
  fi
  gh api "repos/$GITHUB_REPOSITORY/statuses/$HEAD_SHA" -f state=success \
    -f context="$APPROVAL_CONTEXT" -f description="$APPROVAL_LABEL was applied to this commit" > /dev/null
  echo "Recorded $APPROVAL_CONTEXT on $HEAD_SHA (labelled ${age}s after it was pushed)."
}

refuse_approval() {
  echo "refusal=$1" >> "$GITHUB_OUTPUT"
  echo "pr-gates: not recording the approval. $1." >&2
  exit 1
}

# Succeeds (and says why) when the owner-approved label on PR JSON $1 is stale for head $2: its
# add, the newest owner-approved event in the timeline, came before $2 was pushed. Fails, keeping
# the label, when it was added at or after the push, or when the push or the add is not listed
# (yet): cleanup is best-effort, and the gate never counts a label without an approval on the
# head. API errors also keep it, since this runs as a condition.
stale_label() {
  local pushed last
  pushed=$(retry_until_known pushed_at "$1" "$2")
  if [ -z "$pushed" ]; then
    echo "Keeping '$APPROVAL_LABEL': the push of $2 is not listed; cleanup is best-effort and the gate does not count it."
    return 1
  fi
  last=$(label_events | tail -n 1)
  if [ "${last#* }" != labeled ]; then
    echo "Keeping '$APPROVAL_LABEL': the timeline does not show it being added yet."
    return 1
  fi
  if [ "${last%% *}" -ge "$pushed" ]; then
    echo "Keeping '$APPROVAL_LABEL': added after $2 was pushed; record-approval judges it."
    return 1
  fi
  echo "'$APPROVAL_LABEL' was added at ${last%% *}, before $2 was pushed at $pushed (epoch s)."
}

# Hygiene after new commits: the label counts only with an approval on the head, so drop it when
# the live head has none and it was added before that head was pushed. One added after the push
# is the owner's fresh approval of this head, whose record-approval job may still be running
# (RF-176 push race; a GITHUB_TOKEN deletion starts no new run, so it would stand). The decision
# is made twice, RETRY_DELAY apart, on fresh reads, so an add still reaching the timeline
# survives. Labels are checked first, so a PR without the label costs one API call.
void_approval() {
  need GH_TOKEN GITHUB_REPOSITORY PR_NUMBER
  local pr head bound pass
  for pass in 1 2; do
    if [ "$pass" -eq 2 ]; then sleep "$RETRY_DELAY"; fi
    pr=$(pr_json)
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
    stale_label "$pr" "$head" || return 0
  done
  gh api -X DELETE "repos/$GITHUB_REPOSITORY/issues/$PR_NUMBER/labels/$APPROVAL_LABEL" > /dev/null
  echo "Removed '$APPROVAL_LABEL': $head has no owner approval."
}

# Judges the PR's live head, not the event's: gate jobs run one at a time and each reads the
# head, files, labels and approvals as they are now (one PR fetch), so the last write matches the
# PR. Approval covers only the commit the owner saw: the label counts only while this exact head
# carries a successful `owner-approval` status. The verdict comes from the checker's
# OWNER_GATE_RESULT file, never its log text. Any error before or in the checker (prepare, a
# missing checker, no verdict) exits non-zero, and the workflow's error step writes failure.
# The description of an unapproved verdict says what to do: RECORD_REFUSAL when this run's
# record-approval refused, else "recording failed" when it failed (RECORD_FAILED=true), else
# "remove and re-add" when the label is on the PR without an approval on this head, else "need
# owner-approved". A legacy checker's exit 1 may also be a crash, so that description keeps the
# "or the gate failed" hint and shows only an actual refusal, never a guess.
gate_status() {
  need GH_TOKEN GITHUB_REPOSITORY PR_NUMBER RUNNER_TEMP
  local pr head checker labels labelled=false bound result rc verdict unapproved state description
  local refusal=${RECORD_REFUSAL:-}
  pr=$(pr_json)
  head=$(jq -r '.head.sha // ""' <<< "$pr")
  [ -n "$head" ] || { echo "pr-gates: no head SHA for PR #$PR_NUMBER." >&2; exit 1; }
  PR_JSON="$pr" prepare
  checker="$RUNNER_TEMP/owner-gate.mjs"
  [ -s "$checker" ] && [ -s "$RUNNER_TEMP/pr-files.txt" ] ||
    { echo "pr-gates: prepare left no checker or no changed files." >&2; exit 1; }
  labels=$(jq -c '[.labels[].name]' <<< "$pr")
  if jq -e --arg l "$APPROVAL_LABEL" 'index($l) != null' <<< "$labels" > /dev/null; then
    labelled=true
  fi
  bound=$(approvals "$head")
  if [ "$bound" -eq 0 ]; then
    echo "No $APPROVAL_CONTEXT status on $head; $APPROVAL_LABEL (if present) is not counted."
    labels=$(jq -c --arg l "$APPROVAL_LABEL" 'map(select(. != $l))' <<< "$labels")
  fi
  result="$RUNNER_TEMP/owner-gate-result.json"
  rm -f "$result"
  set +e
  OWNER_GATE_LABELS="$labels" OWNER_GATE_RESULT="$result" node "$checker" < "$RUNNER_TEMP/pr-files.txt"
  rc=$?
  set -e
  verdict=''
  if [ -s "$result" ]; then
    verdict=$(jq -r '.result // ""' "$result")
  elif ! grep -qF OWNER_GATE_RESULT "$checker"; then
    # Transitional: main's checker before RF-176 merged writes no verdict and exits 1 both for
    # an unapproved PR and for its own errors (both fail closed). Only a checker that ran and is
    # known not to write one reads as legacy; a checker that supports verdicts and wrote none
    # errored.
    verdict=legacy
  fi
  if [ -n "$refusal" ]; then
    unapproved=$refusal
  elif [ "${RECORD_FAILED:-}" = true ]; then
    unapproved='Recording owner approval failed; re-run the job or re-add the label'
  elif [ "$labelled" = true ]; then
    unapproved="$APPROVAL_LABEL is on the PR but not recorded for ${head:0:7}; remove and re-add it"
  else
    unapproved="Owner-gated paths need owner-approved on ${head:0:7}"
  fi
  case "$rc:$verdict" in
    0:clean) state=success description='No owner-gated paths changed' ;;
    0:approved) state=success description="Owner-gated paths; owner-approved on ${head:0:7}" ;;
    1:unapproved)
      state=failure
      description=$unapproved
      ;;
    0:legacy) state=success description="Owner gate passed on ${head:0:7}" ;;
    1:legacy)
      state=failure
      if [ -n "$refusal" ]; then
        description="$refusal (or the gate failed; see the run)"
      else
        description="Owner-gated paths need owner-approved on ${head:0:7}, or the gate failed; see the run"
      fi
      ;;
    *)
      echo "pr-gates: the owner gate could not evaluate $head (exit $rc, verdict '${verdict}')." >&2
      exit 1
      ;;
  esac
  write_status "$head" "$state" "$description"
}

# Fail closed: an error must not leave an older `success` standing. Writes on the live head,
# falling back to the event's head when the API cannot say.
gate_error() {
  need GH_TOKEN GITHUB_REPOSITORY PR_NUMBER EVENT_SHA
  local head
  head=$(gh api "repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER" --jq .head.sha) || head=''
  write_status "${head:-$EVENT_SHA}" failure "${1:-Owner gate errored; re-run this job}"
}

case "${1:-}" in
  self-check) self_check ;;
  prepare) prepare ;;
  record-approval) record_approval ;;
  void-approval) void_approval ;;
  gate-status) gate_status ;;
  gate-error) gate_error "${2:-}" ;;
  *)
    echo "usage: pr-gates.sh self-check|prepare|record-approval|void-approval|gate-status|gate-error [msg]" >&2
    exit 2
    ;;
esac
