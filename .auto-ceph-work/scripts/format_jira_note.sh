#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "usage: $0 start <stage> | summary <stage> <ticket-id> <artifact-path> <next-action> [blocker]"
  exit 1
fi

MODE="$1"

if [ "$MODE" = "start" ]; then
  if [ "$#" -ne 2 ]; then
    echo "usage: $0 start <stage>"
    exit 1
  fi

  STAGE="$2"
  cat <<EOF
#### $STAGE

- 시작
EOF
  exit 0
fi

if [ "$MODE" != "summary" ] || [ "$#" -lt 5 ]; then
  echo "usage: $0 summary <stage> <ticket-id> <artifact-path> <next-action> [blocker]"
  exit 1
fi

STAGE="$2"
TICKET_ID="$3"
ARTIFACT_PATH="$4"
NEXT_ACTION="$5"
BLOCKER="${6:-없음}"
STAMP="$(date '+%Y-%m-%d %H:%M:%S %Z')"

cat <<EOF
#### $STAGE

- 티켓: $TICKET_ID
- 마지막 갱신: $STAMP
- 산출물: $ARTIFACT_PATH
- 다음 액션: $NEXT_ACTION
- blocker: $BLOCKER
EOF
