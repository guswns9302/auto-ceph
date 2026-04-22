#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "usage: $0 <TICKET-ID>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TICKET_ID="$1"
VERIFY_ENV_FILE="$ROOT_DIR/doc/VERIFY_ENV.md"
PLAN_FILE="$ROOT_DIR/doc/$TICKET_ID/03_PLAN.md"
EXECUTION_FILE="$ROOT_DIR/doc/$TICKET_ID/04_EXECUTION.md"

# shellcheck disable=SC1090
eval "$(bash "$SCRIPT_DIR/resolve_ticket_context.sh" "$TICKET_ID")"

extract_field() {
  local file="$1"
  local key="$2"
  if [ -f "$file" ]; then
    sed -n "s/^- ${key}:[[:space:]]*//p" "$file" | head -1
  fi
}

trim() {
  printf '%s' "$1" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//'
}

join_url() {
  local base="$1"
  local path="$2"
  if [ -z "$base" ] || [ -z "$path" ]; then
    return 1
  fi

  base="${base%/}"
  if [[ "$path" != /* ]]; then
    path="/$path"
  fi

  printf '%s%s' "$base" "$path"
}

escape_json_string() {
  printf '%s' "$1" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'
}

extract_section_field() {
  local file="$1"
  local section="$2"
  local key="$3"
  [ -f "$file" ] || return 0
  awk -v section="$section" -v key="$key" '
    $0 == section { in_section=1; next }
    /^## / && in_section { exit }
    in_section && index($0, "- " key ":") == 1 {
      value=$0
      sub("^- " key ":[[:space:]]*", "", value)
      print value
      exit
    }
  ' "$file"
}

base_url="$(trim "$(extract_field "$VERIFY_ENV_FILE" "base_url")")"
provider_id="$(trim "$(extract_field "$VERIFY_ENV_FILE" "X-Provider-Id")")"
user_id="$(trim "$(extract_field "$VERIFY_ENV_FILE" "X-User-Id")")"
plan_method="$(trim "$(extract_section_field "$PLAN_FILE" "## 검증용 API 호출 스펙" "method")")"
plan_endpoint="$(trim "$(extract_section_field "$PLAN_FILE" "## 검증용 API 호출 스펙" "endpoint")")"
plan_body="$(extract_section_field "$PLAN_FILE" "## 검증용 API 호출 스펙" "body")"
execution_method="$(trim "$(extract_section_field "$EXECUTION_FILE" "## 검증용 API 호출 실행값" "method")")"
execution_endpoint="$(trim "$(extract_section_field "$EXECUTION_FILE" "## 검증용 API 호출 실행값" "endpoint")")"
execution_body="$(extract_section_field "$EXECUTION_FILE" "## 검증용 API 호출 실행값" "body")"
request_method="$(trim "${execution_method:-$plan_method}")"
request_path="$(trim "${execution_endpoint:-$plan_endpoint}")"
request_body_raw="${execution_body:-$plan_body}"
request_body="$(trim "$request_body_raw")"

if [ ! -f "$VERIFY_ENV_FILE" ]; then
  echo "result=blocked"
  echo "reason=missing_verify_env_file"
  echo "verify_env_file=$VERIFY_ENV_FILE"
  exit 1
fi

if [ -z "$base_url" ] || [ -z "$provider_id" ] || [ -z "$user_id" ]; then
  echo "result=blocked"
  echo "reason=missing_verify_env_values"
  echo "verify_env_file=$VERIFY_ENV_FILE"
  exit 1
fi

if [ ! -f "$PLAN_FILE" ]; then
  echo "result=blocked"
  echo "reason=missing_plan_file"
  echo "plan_file=$PLAN_FILE"
  exit 1
fi

if [ -z "$request_method" ] || [ -z "$request_path" ]; then
  echo "result=blocked"
  echo "reason=missing_api_request_spec"
  echo "plan_file=$PLAN_FILE"
  exit 1
fi

request_url="$(join_url "$base_url" "$request_path")"
headers_file="$(mktemp)"
body_file="$(mktemp)"
cleanup() {
  rm -f "$headers_file" "$body_file"
}
trap cleanup EXIT

curl_args=(
  -sS
  -D "$headers_file"
  -o "$body_file"
  -H "X-Provider-Id: $provider_id"
  -H "X-User-Id: $user_id"
  -X "$request_method"
)

if [ -n "$request_body" ] && [ "$request_body" != "{}" ] && [ "$request_body" != "-" ]; then
  curl_args+=(
    -H "Content-Type: application/json"
    --data "$request_body"
  )
fi

curl_exit=0
http_status="$(
  curl "${curl_args[@]}" \
    -w '%{http_code}' \
    "$request_url"
)" || curl_exit=$?

response_preview="$(tr '\r\n' '  ' < "$body_file" | tr -s ' ' | cut -c1-400)"

echo "verify_env_file=$VERIFY_ENV_FILE"
echo "ticket_file=$ticket_file"
echo "plan_file=$PLAN_FILE"
echo "execution_file=$EXECUTION_FILE"
echo "request_method=$request_method"
echo "request_url=$request_url"
echo "headers_used=X-Provider-Id,X-User-Id"
echo "request_body=$(printf '%s' "$request_body")"

if [ "$curl_exit" -ne 0 ]; then
  echo "result=failed"
  echo "curl_exit_code=$curl_exit"
  echo "http_status=${http_status:-000}"
  echo "response_preview=$response_preview"
  exit 1
fi

echo "result=passed"
echo "http_status=$http_status"
echo "response_preview=$response_preview"
