#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "usage: $0 <TICKET-ID>"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TICKET_ID="$1"
TICKET_DIR="$ROOT_DIR/doc/$TICKET_ID"

has_nonempty_file() {
  local path="$1"
  [ -f "$path" ] && grep -q '[^[:space:]-]' "$path"
}

has_kv_value() {
  local path="$1"
  local key="$2"
  grep -Eq "^- ${key}:[[:space:]]*[^[:space:]].*$" "$path"
}

has_nonempty_section_bullet() {
  local path="$1"
  local section="$2"
  awk -v section="$section" '
    $0 == section { in_section=1; next }
    /^### / && in_section { exit }
    in_section && $0 ~ /^- / {
      line=$0
      sub(/^- /, "", line)
      gsub(/[[:space:]]/, "", line)
      if (line != "" && line != ":") { found=1; exit }
    }
    END { exit(found ? 0 : 1) }
  ' "$path"
}

has_prefixed_value() {
  local path="$1"
  local label="$2"
  grep -Eq "^- ${label}:[[:space:]]*[^[:space:]].*$" "$path"
}

if [ ! -d "$TICKET_DIR" ]; then
  echo "문제 확인"
  exit 0
fi

if ! has_nonempty_file "$TICKET_DIR/01_TICKET.md" || ! has_nonempty_file "$TICKET_DIR/02_CONTEXT.md"; then
  echo "문제 확인"
  exit 0
fi

if ! has_kv_value "$TICKET_DIR/01_TICKET.md" "repo" \
  || ! has_kv_value "$TICKET_DIR/01_TICKET.md" "remote"; then
  echo "문제 확인"
  exit 0
fi

if ! has_nonempty_section_bullet "$TICKET_DIR/02_CONTEXT.md" "### 구현 대상" \
  || ! has_nonempty_section_bullet "$TICKET_DIR/02_CONTEXT.md" "### 검증 포인트"; then
  echo "문제 검토"
  exit 0
fi

if ! has_nonempty_file "$TICKET_DIR/03_PLAN.md" \
  || ! grep -q "기준 브랜치: dev" "$TICKET_DIR/03_PLAN.md" \
  || ! has_prefixed_value "$TICKET_DIR/03_PLAN.md" "목표" \
  || ! has_prefixed_value "$TICKET_DIR/03_PLAN.md" "성공 기준"; then
  echo "계획"
  exit 0
fi

if ! has_nonempty_file "$TICKET_DIR/04_EXECUTION.md" \
  || ! has_prefixed_value "$TICKET_DIR/04_EXECUTION.md" "수행 내용"; then
  echo "수행"
  exit 0
fi

if ! has_nonempty_file "$TICKET_DIR/05_UAT.md" \
  || ! has_kv_value "$TICKET_DIR/05_UAT.md" "최종 판단"; then
  echo "검증"
  exit 0
fi

if ! has_nonempty_file "$TICKET_DIR/06_REVIEW.md" \
  || ! has_kv_value "$TICKET_DIR/06_REVIEW.md" "결과"; then
  echo "코드 리뷰"
  exit 0
fi

if ! has_nonempty_file "$TICKET_DIR/07_SUMMARY.md" \
  || ! has_prefixed_value "$TICKET_DIR/07_SUMMARY.md" "주요 변경 1"; then
  echo "리뷰 요청"
  exit 0
fi

echo "완료"
