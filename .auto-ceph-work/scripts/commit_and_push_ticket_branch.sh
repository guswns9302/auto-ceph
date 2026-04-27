#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "usage: $0 <TICKET-ID> <REMOTE> [COMMIT-MESSAGE]" >&2
  exit 1
fi

TICKET_ID="$1"
REMOTE_NAME="$2"
COMMIT_MESSAGE="${3:-feat(auto-ceph): finish $TICKET_ID}"
TICKET_BRANCH="feature/$TICKET_ID"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo "not a git repository" >&2
  exit 1
}

CURRENT_BRANCH="$(git branch --show-current)"
if [ "$CURRENT_BRANCH" != "$TICKET_BRANCH" ]; then
  echo "post_ticket_branch_mismatch: expected $TICKET_BRANCH, got $CURRENT_BRANCH" >&2
  exit 1
fi

if [ -n "$(git status --short)" ]; then
  git add -A
  git commit -m "$COMMIT_MESSAGE" >/dev/null 2>&1
  printf "commit_performed='yes'\n"
else
  printf "commit_performed='no'\n"
fi

if git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' >/dev/null 2>&1; then
  git push >/dev/null 2>&1
  printf "push_target='upstream'\n"
else
  git remote get-url "$REMOTE_NAME" >/dev/null 2>&1 || {
    echo "remote not found: $REMOTE_NAME" >&2
    exit 1
  }
  git push -u "$REMOTE_NAME" "$TICKET_BRANCH" >/dev/null 2>&1
  printf "push_target='%s/%s'\n" "$REMOTE_NAME" "$TICKET_BRANCH"
fi

printf "ticket_branch='%s'\n" "$TICKET_BRANCH"
