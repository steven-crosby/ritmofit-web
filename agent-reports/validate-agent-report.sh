#!/usr/bin/env bash
# Validate a ritmofit-web agent report against AGENT_REPORT_TEMPLATE.md.
# A run is INCOMPLETE until this passes. Usage:
#   ./agent-reports/validate-agent-report.sh agent-reports/2026-06-26/changed-code-sentinel.md
set -euo pipefail

REPORT="${1:-}"
if [ -z "$REPORT" ]; then
  echo "usage: $0 <path-to-report.md>" >&2
  exit 2
fi
if [ ! -f "$REPORT" ]; then
  echo "FAIL: report not found: $REPORT" >&2
  exit 1
fi

errors=0
fail() { echo "FAIL: $1" >&2; errors=$((errors + 1)); }

# --- frontmatter must be a leading --- ... --- block ---------------------------
if [ "$(head -n1 "$REPORT")" != "---" ]; then
  fail "missing YAML frontmatter (file must start with '---')"
fi

# Extract the frontmatter block (between the first two '---' lines).
fm="$(awk 'NR==1&&$0=="---"{f=1;next} f&&$0=="---"{exit} f{print}' "$REPORT")"

# Read a scalar frontmatter value, stripping any trailing ' # comment' and whitespace.
fm_value() {
  printf '%s\n' "$fm" | sed -n "s/^$1:[[:space:]]*//p" | head -n1 \
    | sed -e 's/[[:space:]]*#.*$//' -e 's/[[:space:]]*$//'
}

# Required key: present and not left at its template placeholder.
require_key() {
  local key="$1" placeholder="$2" val
  val="$(fm_value "$key")"
  if [ -z "$val" ]; then
    fail "frontmatter missing or empty: '${key}'"
  elif [ -n "$placeholder" ] && printf '%s' "$val" | grep -qF "$placeholder"; then
    fail "frontmatter '${key}' still has the template placeholder ($val)"
  fi
}

require_key prompt ""
require_key repo ""
require_key agent "<model or agent id>"
require_key date ""
require_key inspected_head "<40-char sha>"
require_key completed ""

# date must look like YYYY-MM-DD
date_val="$(fm_value date)"
if ! printf '%s' "$date_val" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'; then
  fail "frontmatter 'date' must be YYYY-MM-DD (got: '${date_val}')"
fi

# repo should be ritmofit-web for this archive
repo_val="$(fm_value repo)"
if [ "$repo_val" != "ritmofit-web" ]; then
  fail "frontmatter 'repo' must be 'ritmofit-web' (got: '${repo_val}')"
fi

# completed must be a literal true or false
completed_val="$(fm_value completed)"
case "$completed_val" in
  true|false) ;;
  *) fail "frontmatter 'completed' must be true or false (got: '${completed_val}')" ;;
esac

# --- required body sections ----------------------------------------------------
# Universal minimum across audits and briefs: what happened + what to do next.
# Audit prompts also include "## Findings" (required by house-rules prose, not here).
for section in "## Summary" "## Next recommended action"; do
  if ! grep -qF "$section" "$REPORT"; then
    fail "missing required section: '${section}'"
  fi
done

if [ "$errors" -ne 0 ]; then
  echo "INVALID: $REPORT ($errors problem(s))" >&2
  exit 1
fi
echo "OK: $REPORT"
