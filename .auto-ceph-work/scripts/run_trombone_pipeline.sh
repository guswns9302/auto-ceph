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
SAFE_REPO="$(printf '%s' "$REPO_NAME" | tr -cd '[:alnum:]' | cut -c1-12)"
PLAYWRIGHT_SESSION="${PLAYWRIGHT_CLI_SESSION:-acw-${SAFE_REPO:-repo}-$$}"

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

js_string() {
  node -e 'const fs = require("node:fs"); process.stdout.write(JSON.stringify(fs.readFileSync(0, "utf8")));'
}

js_char_codes() {
  node -e 'const fs = require("node:fs"); process.stdout.write([...fs.readFileSync(0, "utf8")].map((char) => char.charCodeAt(0)).join(","));'
}

run_pwcli() {
  local output
  local status
  set +e
  output="$("$PWCLI_BIN" --session "$PLAYWRIGHT_SESSION" "$@" 2>&1)"
  status=$?
  set -e
  printf '%s\n' "$output"
  if [ "$status" -ne 0 ]; then
    return "$status"
  fi
  if printf '%s\n' "$output" | grep -q '^### Error'; then
    return 1
  fi
  return 0
}

cleanup() {
  if [ -n "${RUN_CODE_FILE:-}" ] && [ -f "$RUN_CODE_FILE" ]; then
    rm -f "$RUN_CODE_FILE"
  fi
  "$PWCLI_BIN" --session "$PLAYWRIGHT_SESSION" close >/dev/null 2>&1 || true
}
trap cleanup EXIT

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

"$PWCLI_BIN" run-code --help >/dev/null 2>&1 || {
  echo "playwright cli run-code is not available" >&2
  exit 1
}

PIPELINE_NAME="${PIPELINE_PREFIX}${REPO_NAME}"
REPO_JSON="$(printf '%s' "$REPO_NAME" | js_string)"
PIPELINE_PREFIX_JSON="$(printf '%s' "$PIPELINE_PREFIX" | js_string)"
LOGIN_ID_JSON="$(printf '%s' "$LOGIN_ID" | js_string)"
LOGIN_PW_CODES="$(printf '%s' "$LOGIN_PW" | js_char_codes)"
RUN_CODE_FILE="$(mktemp "${TMPDIR:-/tmp}/auto-ceph-trombone.XXXXXX.js")"
chmod 600 "$RUN_CODE_FILE"

cat > "$RUN_CODE_FILE" <<EOF
async (page) => {
const repo = ${REPO_JSON};
const pipelinePrefix = ${PIPELINE_PREFIX_JSON};
const pipelineName = pipelinePrefix + repo;
const loginId = ${LOGIN_ID_JSON};
const loginPw = String.fromCharCode(${LOGIN_PW_CODES});

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
    throw new Error("missing " + label + " input");
  }
  await locator.fill(value);
}

async function clickOne(selectors, label) {
  const locator = await firstLocator(selectors);
  if (!locator) {
    throw new Error("missing " + label);
  }
  await locator.click();
}

function normalizeText(text) {
  return String(text || "").replace(/\\s+/g, " ").trim();
}

async function getRowActionButton(row) {
  const button = row.locator("button").filter({ hasText: /^(실행|중지)$/ }).first();
  await button.waitFor({ state: "visible", timeout: 10000 });
  return button;
}

async function getRowActionButtonText(row) {
  const button = await getRowActionButton(row);
  return normalizeText(await button.innerText());
}

async function waitForRowButtonText(row, expectedText, timeoutMs, failureLabel) {
  const timeoutAt = Date.now() + timeoutMs;
  let lastText = "";
  while (Date.now() < timeoutAt) {
    lastText = await getRowActionButtonText(row).catch((error) => "error:" + error.message);
    if (lastText === expectedText) {
      return;
    }
    await page.waitForTimeout(10000);
  }
  throw new Error(failureLabel + " timeout for " + pipelineName + ": last button text=" + lastText);
}

async function getPipelineHistoryFirstRow() {
  const heading = page.getByText("파이프라인 실행이력", { exact: true }).first();
  await heading.waitFor({ state: "visible", timeout: 10000 });
  const table = page.locator("table").filter({ hasText: "파이프라인 실행이력" }).first();
  const scopedTable = await table.count() ? table : heading.locator("xpath=following::table[1]");
  await scopedTable.waitFor({ state: "visible", timeout: 10000 });

  const headerCells = scopedTable.locator("thead tr").first().locator("th,td");
  const headerCount = await headerCells.count();
  const headers = [];
  for (let index = 0; index < headerCount; index += 1) {
    headers.push(normalizeText(await headerCells.nth(index).innerText()));
  }

  const statusIndex = headers.findIndex((header) => header === "상태");
  const logCollectionIndex = headers.findIndex((header) => header === "로그수집여부");
  if (statusIndex < 0 || logCollectionIndex < 0) {
    throw new Error("missing pipeline history columns: " + headers.join(","));
  }

  const firstRow = scopedTable.locator("tbody tr").first();
  await firstRow.waitFor({ state: "visible", timeout: 10000 });
  const cells = firstRow.locator("td");
  return {
    status: normalizeText(await cells.nth(statusIndex).innerText()),
    logCollection: normalizeText(await cells.nth(logCollectionIndex).innerText()),
  };
}

async function waitForPipelineHistoryCompletion() {
  const timeoutAt = Date.now() + 30 * 60 * 1000;
  let lastState = "";
  while (Date.now() < timeoutAt) {
    const firstRow = await getPipelineHistoryFirstRow();
    lastState = "상태=" + firstRow.status + ", 로그수집여부=" + firstRow.logCollection;
    if (firstRow.status === "실패") {
      throw new Error("trombone deployment failed for " + pipelineName + ": " + lastState);
    }
    if (firstRow.status === "성공" && firstRow.logCollection === "수집") {
      return;
    }
    if (firstRow.status === "성공" && firstRow.logCollection === "미수집") {
      await page.waitForTimeout(10000);
      await page.reload({ waitUntil: "domcontentloaded" });
      continue;
    }
    await page.waitForTimeout(10000);
    await page.reload({ waitUntil: "domcontentloaded" });
  }
  throw new Error("pipeline history completion timeout for " + pipelineName + ": " + lastState);
}

await page.waitForLoadState("domcontentloaded");
await fillOne(["input[name='username']", "#username", "input[type='text']", "input[placeholder*='아이디']"], loginId, "username");
await fillOne(["input[name='password']", "#password", "input[type='password']", "input[placeholder*='비밀번호']"], loginPw, "password");
await clickOne(["button[type='submit']", "button:has-text('로그인')", "button:has-text('Login')"], "login button");
await page.waitForLoadState("domcontentloaded");
await page.waitForTimeout(3000);

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
  throw new Error("run button is disabled for " + pipelineName);
}
await runButton.click();
await waitForRowButtonText(row, "중지", 60 * 1000, "pipeline start");
await waitForRowButtonText(row, "실행", 30 * 60 * 1000, "pipeline stop");
await row.click();
await waitForPipelineHistoryCompletion();
}
EOF

run_pwcli open "$LOGIN_URL" >/dev/null
run_pwcli run-code --filename "$RUN_CODE_FILE"

printf "status=completed\n"
printf "pipeline=%s\n" "$PIPELINE_NAME"
