#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "usage: $0 <TICKET-ID>"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TICKET_ID="$1"
TICKET_DIR="$ROOT_DIR/doc/$TICKET_ID"
TICKET_FILE="$TICKET_DIR/01_TICKET.md"
CONTEXT_FILE="$TICKET_DIR/02_CONTEXT.md"
PLAN_FILE="$TICKET_DIR/03_PLAN.md"
EXECUTION_FILE="$TICKET_DIR/04_EXECUTION.md"
UAT_FILE="$TICKET_DIR/05_UAT.md"
SUMMARY_FILE="$TICKET_DIR/06_SUMMARY.md"
LOOP_FILE="$TICKET_DIR/07_LOOP.md"
VERIFY_ENV_FILE="$ROOT_DIR/doc/VERIFY_ENV.md"

extract_field() {
  local file="$1"
  local key="$2"
  if [ -f "$file" ]; then
    sed -n "s/^- ${key}:[[:space:]]*//p" "$file" | head -1
  fi
}

emit_assignment() {
  local key="$1"
  local value="$2"
  value="${value//\'/\'\\\'\'}"
  printf "%s='%s'\n" "$key" "$value"
}

repo="$(extract_field "$TICKET_FILE" "repo")"
remote="$(extract_field "$TICKET_FILE" "remote")"
endpoint="$(extract_field "$TICKET_FILE" "endpoint")"
project_repo="$(basename "$ROOT_DIR")"
ticket_branch="feature/$TICKET_ID"
base_branch="dev"

emit_assignment "ticket_id" "$TICKET_ID"
emit_assignment "root_dir" "$ROOT_DIR"
emit_assignment "ticket_dir" "$TICKET_DIR"
emit_assignment "ticket_file" "$TICKET_FILE"
emit_assignment "context_file" "$CONTEXT_FILE"
emit_assignment "plan_file" "$PLAN_FILE"
emit_assignment "execution_file" "$EXECUTION_FILE"
emit_assignment "uat_file" "$UAT_FILE"
emit_assignment "summary_file" "$SUMMARY_FILE"
emit_assignment "loop_file" "$LOOP_FILE"
emit_assignment "verify_env_file" "$VERIFY_ENV_FILE"
emit_assignment "project_repo" "$project_repo"
emit_assignment "repo" "$repo"
emit_assignment "remote" "$remote"
emit_assignment "endpoint" "$endpoint"
emit_assignment "ticket_branch" "$ticket_branch"
emit_assignment "base_branch" "$base_branch"
