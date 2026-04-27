#!/usr/bin/env bash
set -euo pipefail

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo "not a git repository" >&2
  exit 1
}

git show-ref --verify --quiet "refs/heads/dev" || {
  echo "dev branch not found" >&2
  exit 1
}

git checkout dev >/dev/null 2>&1
printf "current_branch='dev'\n"
