#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "usage: $0 <TICKET-ID>"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TICKET_ID="$1"

exec bash "$ROOT_DIR/.auto-ceph-work/scripts/new-ticket-doc.sh" "$TICKET_ID"
