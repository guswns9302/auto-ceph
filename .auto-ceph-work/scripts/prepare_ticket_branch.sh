#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "usage: $0 <TICKET-ID> <REMOTE> [BASE-BRANCH]" >&2
  exit 1
fi

TICKET_ID="$1"
REMOTE_NAME="$2"
BASE_BRANCH="${3:-dev}"
TICKET_BRANCH="feature/$TICKET_ID"

require_git_repo() {
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
    echo "not a git repository" >&2
    exit 1
  }
}

require_remote() {
  git remote get-url "$REMOTE_NAME" >/dev/null 2>&1 || {
    echo "remote not found: $REMOTE_NAME" >&2
    exit 1
  }
}

checkout_local_base() {
  if git show-ref --verify --quiet "refs/heads/$BASE_BRANCH"; then
    git checkout "$BASE_BRANCH" >/dev/null 2>&1
  else
    git checkout -B "$BASE_BRANCH" "refs/remotes/$REMOTE_NAME/$BASE_BRANCH" >/dev/null 2>&1
  fi
}

require_git_repo
require_remote

git fetch "$REMOTE_NAME" "$BASE_BRANCH" >/dev/null 2>&1
checkout_local_base
git reset --hard "refs/remotes/$REMOTE_NAME/$BASE_BRANCH" >/dev/null 2>&1

if git show-ref --verify --quiet "refs/heads/$TICKET_BRANCH"; then
  git checkout "$TICKET_BRANCH" >/dev/null 2>&1
else
  git checkout -b "$TICKET_BRANCH" "$BASE_BRANCH" >/dev/null 2>&1
fi

CURRENT_BRANCH="$(git branch --show-current)"
if [ "$CURRENT_BRANCH" != "$TICKET_BRANCH" ]; then
  echo "ticket branch not prepared: expected $TICKET_BRANCH, got $CURRENT_BRANCH" >&2
  exit 1
fi

printf "ticket_branch='%s'\n" "$TICKET_BRANCH"
printf "base_branch='%s'\n" "$BASE_BRANCH"
printf "remote='%s'\n" "$REMOTE_NAME"
