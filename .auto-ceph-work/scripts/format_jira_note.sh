#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "usage: $0 start <stage> | summary <stage> <ticket-id> <artifact-path> <next-action> [blocker]"
  exit 1
fi

trim_blank_lines() {
  awk '
    BEGIN { seen = 0 }
    {
      if ($0 ~ /^[[:space:]]*$/) {
        if (seen) {
          buffer = buffer $0 "\n"
        }
        next
      }

      seen = 1
      if (buffer != "") {
        printf "%s", buffer
        buffer = ""
      }
      print
    }
  '
}

extract_section_body() {
  local file_path="$1"
  local header="$2"
  awk -v header="$header" '
    function heading_level(line,   prefix) {
      if (line ~ /^#+[[:space:]]+/) {
        prefix = line
        sub(/[[:space:]].*/, "", prefix)
        return length(prefix)
      }
      return 0
    }

    $0 == header {
      capture = 1
      level = heading_level($0)
      next
    }

    capture {
      current = heading_level($0)
      if (current > 0 && current <= level) {
        exit
      }
      print
    }
  ' "$file_path" | trim_blank_lines
}

extract_task_blocks() {
  local file_path="$1"
  awk '
    /^### Task / {
      capture = 1
    }

    capture && /^## / {
      exit
    }

    capture {
      print
    }
  ' "$file_path" | trim_blank_lines
}

render_named_block() {
  local title="$1"
  local body="$2"

  if [ -z "$body" ]; then
    return 0
  fi

  printf -- "- %s:\n" "$title"
  printf '%s\n' "$body" | sed 's/^/  /'
  printf '\n'
}

render_stage_extracts() {
  local stage="$1"
  local artifact_path="$2"

  case "$stage" in
    "문제 확인")
      render_named_block "프로젝트" "$(extract_section_body "$artifact_path" "## 프로젝트")"
      render_named_block "문제점" "$(extract_section_body "$artifact_path" "### 문제점")"
      render_named_block "개선 방향" "$(extract_section_body "$artifact_path" "### 개선 방향")"
      ;;
    "문제 검토")
      render_named_block "구현 대상" "$(extract_section_body "$artifact_path" "## 구현 대상")"
      render_named_block "검증 포인트" "$(extract_section_body "$artifact_path" "## 검증 포인트")"
      ;;
    "계획")
      render_named_block "실행 계획" "$(extract_section_body "$artifact_path" "## 실행 계획")"
      render_named_block "검증 계획" "$(extract_section_body "$artifact_path" "## 검증 계획")"
      render_named_block "검증 Unblock 정책" "$(extract_section_body "$artifact_path" "## 검증 Unblock 정책")"
      ;;
    "수행")
      render_named_block "수행 내용" "$(extract_task_blocks "$artifact_path")"
      render_named_block "검증 보정 사항" "$(extract_section_body "$artifact_path" "## 검증 보정 사항")"
      render_named_block "검증 Unblock 수정" "$(extract_section_body "$artifact_path" "## 검증 Unblock 수정")"
      ;;
    "검증")
      render_named_block "실행 결과" "$(extract_section_body "$artifact_path" "## 실행 결과")"
      ;;
    "코드 리뷰")
      render_named_block "핵심 finding" "$(extract_section_body "$artifact_path" "## 핵심 finding")"
      render_named_block "판정" "$(extract_section_body "$artifact_path" "## 판정")"
      render_named_block "다음 액션" "$(extract_section_body "$artifact_path" "## 다음 액션")"
      ;;
    "리뷰 요청")
      render_named_block "변경 사항" "$(extract_section_body "$artifact_path" "## 변경 사항")"
      render_named_block "검증 결과" "$(extract_section_body "$artifact_path" "## 검증 결과")"
      render_named_block "코드 리뷰 결과" "$(extract_section_body "$artifact_path" "## 코드 리뷰 결과")"
      render_named_block "Merge Request" "$(extract_section_body "$artifact_path" "## Merge Request")"
      ;;
  esac
}

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

if [ ! -f "$ARTIFACT_PATH" ]; then
  echo "artifact not found: $ARTIFACT_PATH" >&2
  exit 1
fi

{
  cat <<EOF
#### $STAGE

- 티켓: $TICKET_ID
- 마지막 갱신: $STAMP
- 산출물: $ARTIFACT_PATH
EOF
  render_stage_extracts "$STAGE" "$ARTIFACT_PATH"
  cat <<EOF
- 다음 액션: $NEXT_ACTION
- blocker: $BLOCKER
EOF
} | awk 'BEGIN { blank = 0 } { if ($0 == "") { if (blank) next; blank = 1 } else { blank = 0 } print }'
