#!/usr/bin/env bash
set -euo pipefail

CONFIG_HOME="${CODEX_HOME:-$HOME/.codex}"
CONFIG_FILE="$CONFIG_HOME/config.toml"

emit_assignment() {
  local key="$1"
  local value="$2"
  value="${value//\'/\'\\\'\'}"
  printf "%s='%s'\n" "$key" "$value"
}

if [ ! -f "$CONFIG_FILE" ]; then
  echo "config_not_found=1"
  emit_assignment "config_file" "$CONFIG_FILE"
  emit_assignment "jira_username" ""
  exit 0
fi

jira_username="$(
  awk '
    /^\[mcp_servers\.mcp-atlassian\.env\]/ { in_section=1; next }
    /^\[/ && in_section { exit }
    in_section && /^[[:space:]]*JIRA_USERNAME[[:space:]]*=/ {
      line=$0
      sub(/^[[:space:]]*JIRA_USERNAME[[:space:]]*=[[:space:]]*/, "", line)
      gsub(/^[[:space:]]*"/, "", line)
      gsub(/"[[:space:]]*$/, "", line)
      print line
      exit
    }
  ' "$CONFIG_FILE"
)"

emit_assignment "config_file" "$CONFIG_FILE"
emit_assignment "jira_username" "$jira_username"
