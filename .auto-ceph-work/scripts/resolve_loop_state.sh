#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "usage: $0 <TICKET-ID>"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TICKET_ID="$1"
LOOP_FILE="$ROOT_DIR/doc/$TICKET_ID/08_LOOP.md"
DEFAULT_LOOP_LIMIT=10
NON_RETRYABLE_REASONS="missing_title_prefix missing_required_inputs repo_mismatch ticket_branch_not_prepared post_ticket_branch_mismatch"

extract_meta_field() {
  local key="$1"
  if [ -f "$LOOP_FILE" ]; then
    sed -n "s/^- ${key}:[[:space:]]*//p" "$LOOP_FILE" | head -1
  fi
}

emit_assignment() {
  local key="$1"
  local value="$2"
  value="${value//\'/\'\\\'\'}"
  printf "%s='%s'\n" "$key" "$value"
}

if [ ! -f "$LOOP_FILE" ]; then
  emit_assignment "loop_file" "$LOOP_FILE"
  emit_assignment "loop_limit" "$DEFAULT_LOOP_LIMIT"
  emit_assignment "current_iteration" "0"
  emit_assignment "next_iteration" "1"
  emit_assignment "run_iteration" "1"
  emit_assignment "current_loop_status" "idle"
  emit_assignment "current_stage" ""
  emit_assignment "last_status" ""
  emit_assignment "last_loop_decision" ""
  emit_assignment "last_fallback_stage" ""
  emit_assignment "last_terminal_reason" ""
  emit_assignment "can_retry" "yes"
  exit 0
fi

last_iteration_in_history="$(
  awk '
    /^### Iteration / {
      n=$3 + 0
      if (n > max) {
        max=n
      }
    }
    END {
      if (max == "") {
        max=0
      }
      print max
    }
  ' "$LOOP_FILE"
)"

current_iteration="$(extract_meta_field "현재 iteration")"
loop_limit="$(extract_meta_field "최대 iteration")"
current_loop_status="$(extract_meta_field "현재 loop 상태")"
current_stage="$(extract_meta_field "현재 stage")"
last_status="$(extract_meta_field "마지막 결과 상태")"
last_loop_decision="$(extract_meta_field "마지막 loop 결정")"
last_fallback_stage="$(extract_meta_field "마지막 fallback 단계")"
last_terminal_reason="$(extract_meta_field "마지막 종료 사유")"

if [ -z "$loop_limit" ]; then
  loop_limit="$DEFAULT_LOOP_LIMIT"
fi

if [ -z "$current_iteration" ]; then
  current_iteration="$last_iteration_in_history"
fi

if [ -z "$current_iteration" ]; then
  current_iteration="0"
fi

if [ -z "$current_loop_status" ]; then
  current_loop_status="idle"
fi

if [ -z "$last_status" ]; then
  last_status="$(
    awk -v iteration="$last_iteration_in_history" '
      $0 == "### Iteration " iteration { in_iteration=1; next }
      /^### Iteration / && in_iteration { exit }
      in_iteration && index($0, "- 최종 상태:") == 1 {
        value=$0
        sub("^- 최종 상태:[[:space:]]*", "", value)
        print value
        exit
      }
    ' "$LOOP_FILE"
  )"
fi
next_iteration=$((current_iteration + 1))
if [ "$current_iteration" -eq 0 ]; then
  run_iteration=1
else
  run_iteration="$current_iteration"
fi

if [ "$next_iteration" -le "$loop_limit" ]; then
  can_retry="yes"
else
  can_retry="no"
fi

for reason in $NON_RETRYABLE_REASONS; do
  if [ "${last_terminal_reason:-}" = "$reason" ]; then
    can_retry="no"
    break
  fi
done

emit_assignment "loop_file" "$LOOP_FILE"
emit_assignment "loop_limit" "$loop_limit"
emit_assignment "current_iteration" "$current_iteration"
emit_assignment "next_iteration" "$next_iteration"
emit_assignment "run_iteration" "$run_iteration"
emit_assignment "current_loop_status" "$current_loop_status"
emit_assignment "current_stage" "$current_stage"
emit_assignment "last_status" "$last_status"
emit_assignment "last_loop_decision" "$last_loop_decision"
emit_assignment "last_fallback_stage" "$last_fallback_stage"
emit_assignment "last_terminal_reason" "$last_terminal_reason"
emit_assignment "can_retry" "$can_retry"
