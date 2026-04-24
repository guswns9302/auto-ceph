#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "usage: $0 <REPO> <CONFIG-FILE>" >&2
  exit 1
fi

REPO_NAME="$1"
CONFIG_FILE="$2"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
PWCLI_BIN="${PWCLI_BIN:-$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh}"
PLAYWRIGHT_SESSION="${PLAYWRIGHT_CLI_SESSION:-auto-ceph-approval-$REPO_NAME}"

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

read_config_value() {
  local key="$1"
  local line
  line="$(grep -E "^${key}:" "$CONFIG_FILE" | head -n1 || true)"
  if [ -z "$line" ]; then
    printf ''
    return
  fi
  trim "${line#*:}"
}

[ -f "$CONFIG_FILE" ] || {
  echo "trombone config not found: $CONFIG_FILE" >&2
  exit 1
}

CONFIG_REPO="$(read_config_value repo)"
PIPELINE_PREFIX="$(read_config_value pipeline_prefix)"
LOGIN_URL="$(read_config_value login_url)"
LOGIN_ID="$(read_config_value id)"
LOGIN_PW="$(read_config_value pw)"

[ -n "$CONFIG_REPO" ] || { echo "missing trombone config key: repo" >&2; exit 1; }
[ -n "$PIPELINE_PREFIX" ] || { echo "missing trombone config key: pipeline_prefix" >&2; exit 1; }
[ -n "$LOGIN_URL" ] || { echo "missing trombone config key: login_url" >&2; exit 1; }
[ -n "$LOGIN_ID" ] || { echo "missing trombone config key: id" >&2; exit 1; }
[ -n "$LOGIN_PW" ] || { echo "missing trombone config key: pw" >&2; exit 1; }

[ "$CONFIG_REPO" = "$REPO_NAME" ] || {
  echo "trombone config repo mismatch: expected $REPO_NAME, got $CONFIG_REPO" >&2
  exit 1
}

command -v npx >/dev/null 2>&1 || {
  echo "npx not found" >&2
  exit 1
}

[ -x "$PWCLI_BIN" ] || {
  echo "playwright cli wrapper not found: $PWCLI_BIN" >&2
  exit 1
}

PIPELINE_NAME="${PIPELINE_PREFIX}${REPO_NAME}"

RUN_CODE="$(cat <<'EOF'
const repo = process.env.TROMBONE_REPO;
const pipelinePrefix = process.env.TROMBONE_PIPELINE_PREFIX;
const pipelineName = `${pipelinePrefix}${repo}`;
const loginId = process.env.TROMBONE_LOGIN_ID;
const loginPw = process.env.TROMBONE_LOGIN_PW;

async function firstLocator(selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count()) {
      return locator;
    }
  }
  return null;
}

async function fillOne(selectors, value, label) {
  const locator = await firstLocator(selectors);
  if (!locator) {
    throw new Error(`missing ${label} input`);
  }
  await locator.fill(value);
}

async function clickOne(selectors, label) {
  const locator = await firstLocator(selectors);
  if (!locator) {
    throw new Error(`missing ${label}`);
  }
  await locator.click();
}

await page.waitForLoadState("domcontentloaded");
await fillOne(["input[name='username']", "#username", "input[type='text']", "input[placeholder*='아이디']"], loginId, "username");
await fillOne(["input[name='password']", "#password", "input[type='password']", "input[placeholder*='비밀번호']"], loginPw, "password");
await clickOne(["button[type='submit']", "button:has-text('로그인')", "button:has-text('Login')"], "login button");
await page.waitForLoadState("networkidle");

await page.getByText("빌드배포", { exact: true }).click();
await page.getByText("파이프라인 관리", { exact: true }).click();

const searchInput = await firstLocator([
  "input[placeholder*='검색']",
  "input[type='search']",
  "input[name='search']",
  "input"
]);
if (!searchInput) {
  throw new Error("missing pipeline search input");
}
await searchInput.fill(pipelineName);
await page.keyboard.press("Enter");
await page.waitForTimeout(1000);

const row = page.locator("tr", { hasText: pipelineName }).filter({ hasText: "dev" }).first();
await row.waitFor({ state: "visible", timeout: 10000 });

const runButton = row.getByRole("button", { name: "실행" }).first();
await runButton.waitFor({ state: "visible", timeout: 10000 });
if (!(await runButton.isEnabled())) {
  throw new Error(`run button is disabled for ${pipelineName}`);
}
await runButton.click();
EOF
)"

"$PWCLI_BIN" --session "$PLAYWRIGHT_SESSION" open "$LOGIN_URL"
TROMBONE_REPO="$REPO_NAME" \
TROMBONE_PIPELINE_PREFIX="$PIPELINE_PREFIX" \
TROMBONE_LOGIN_ID="$LOGIN_ID" \
TROMBONE_LOGIN_PW="$LOGIN_PW" \
"$PWCLI_BIN" --session "$PLAYWRIGHT_SESSION" run-code "$RUN_CODE"

printf "status=triggered\n"
printf "pipeline=%s\n" "$PIPELINE_NAME"
