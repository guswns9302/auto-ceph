#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "usage: $0 <TICKET-ID>"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TICKET_ID="$1"
TARGET_DIR="$ROOT_DIR/.auto-ceph-work/tickets/$TICKET_ID"
TEMPLATE_DIR="$ROOT_DIR/.auto-ceph-work/templates"

if [ -d "$TARGET_DIR" ]; then
  echo "target already exists: $TARGET_DIR"
  exit 1
fi

mkdir -p "$TARGET_DIR"

for file in 01_TICKET.md 02_CONTEXT.md 03_PLAN.md 04_EXECUTION.md 05_UAT.md 06_REVIEW.md 07_SUMMARY.md 08_LOOP.md; do
  cp "$TEMPLATE_DIR/$file" "$TARGET_DIR/$file"
  perl -0pi -e "s/\\[TICKET-ID\\]/$TICKET_ID/g" "$TARGET_DIR/$file"
done

echo "created: $TARGET_DIR"
echo "next files:"
echo "  - $TARGET_DIR/01_TICKET.md"
echo "  - $TARGET_DIR/02_CONTEXT.md"
echo "  - $TARGET_DIR/03_PLAN.md"
echo "  - $TARGET_DIR/04_EXECUTION.md"
echo "  - $TARGET_DIR/05_UAT.md"
echo "  - $TARGET_DIR/06_REVIEW.md"
echo "  - $TARGET_DIR/07_SUMMARY.md"
echo "  - $TARGET_DIR/08_LOOP.md"
