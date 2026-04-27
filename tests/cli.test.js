"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("node:child_process");

const packageVersion = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")
).version;

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function ticketPath(rootDir, ticketId, ...parts) {
  return path.join(rootDir, ".auto-ceph-work", "tickets", ticketId, ...parts);
}

function makeSourceTree(rootDir) {
  write(path.join(rootDir, ".auto-ceph-work", "project.json"), JSON.stringify({
    version: 1,
    workflow: "auto-ceph-ticket-loop",
    docs_root: ".auto-ceph-work/tickets",
    ticket_root_pattern: ".auto-ceph-work/tickets/<TICKET-ID>",
  }, null, 2));
  write(path.join(rootDir, ".auto-ceph-work", "templates", "08_LOOP.md"), "# [TICKET-ID]\n");
  write(path.join(rootDir, ".auto-ceph-work", "templates", "03_PLAN.md"), "# plan\n");
  write(path.join(rootDir, ".auto-ceph-work", "references", "runtime-contract.md"), "# runtime contract\n");
  write(path.join(rootDir, ".auto-ceph-work", "references", "trombone-config.md"), "repo: auto-ceph\n");
  write(
    path.join(rootDir, ".auto-ceph-work", "references", "e2e-test-config.md"),
    "url: https://example.test/login\nid: tester\npw: secret\n타겟 케이스: .auto-ceph-work/references/test-case/v306.json\n"
  );
  write(
    path.join(rootDir, ".auto-ceph-work", "references", "e2e-scenario-template.md"),
    "#### 테스트 시나리오\n#### 기대 결과\n#### 확인 범위\n"
  );
  write(
    path.join(rootDir, ".auto-ceph-work", "references", "e2e-execution-contract.md"),
    "# E2E Execution Contract\n"
  );
  write(
    path.join(rootDir, ".auto-ceph-work", "references", "e2e-jira-ticket-template.md"),
    "# [ACW E2E] <menu1> E2E 테스트\n### E2E 테스트 결과\n"
  );
  write(path.join(rootDir, ".auto-ceph-work", "references", "test-case", "v306.json"), "{\"features\":[]}\n");
  write(path.join(rootDir, ".auto-ceph-work", "scripts", "new-ticket-doc.sh"), "#!/usr/bin/env bash\n");
  write(path.join(rootDir, ".auto-ceph-work", "scripts", "prepare_ticket_branch.sh"), "#!/usr/bin/env bash\n");
  write(path.join(rootDir, ".auto-ceph-work", "scripts", "commit_and_push_ticket_branch.sh"), "#!/usr/bin/env bash\n");
  write(path.join(rootDir, ".auto-ceph-work", "scripts", "return_to_dev_branch.sh"), "#!/usr/bin/env bash\n");
  write(path.join(rootDir, ".auto-ceph-work", "scripts", "create_or_reuse_merge_request.js"), '"use strict";\n');
  write(path.join(rootDir, ".auto-ceph-work", "scripts", "update_jira_ticket_time_note.js"), '"use strict";\n');
  write(path.join(rootDir, ".auto-ceph-work", "scripts", "select_e2e_cases.js"), '"use strict";\n');
  write(path.join(rootDir, ".auto-ceph-work", "scripts", "approve_and_merge_review_mr.js"), '"use strict";\n');
  write(path.join(rootDir, ".auto-ceph-work", "scripts", "run_trombone_pipeline.sh"), "#!/usr/bin/env bash\n");
  write(path.join(rootDir, ".auto-ceph-work", "hooks", "aceph-prompt-guard.js"), "console.log('prompt');\n");
  write(path.join(rootDir, ".auto-ceph-work", "hooks", "aceph-workflow-guard.js"), "console.log('workflow');\n");
  write(path.join(rootDir, ".auto-ceph-work", "hooks", "lib", "project-root.js"), "module.exports = {};\n");
  write(path.join(rootDir, ".auto-ceph-work", "README.md"), "# work\n");
  write(
    path.join(rootDir, ".codex", "agents", "aceph-ticket-intake.toml"),
    [
      'name = "aceph-ticket-intake"',
      'model = "gpt-5.5"',
      'model_reasoning_effort = "medium"',
      "",
    ].join("\n")
  );
  write(
    path.join(rootDir, ".codex", "agents", "aceph-approval-e2e.toml"),
    [
      'name = "aceph-approval-e2e"',
      'model = "gpt-5.5"',
      'model_reasoning_effort = "medium"',
      "",
    ].join("\n")
  );
  write(path.join(rootDir, ".codex", "commands", "aceph", "next.md"), "---\nname: aceph:next\n---\n");
  write(path.join(rootDir, ".codex", "skills", "auto-ceph", "SKILL.md"), "# auto ceph\n");
  write(path.join(rootDir, ".codex", "skills", "auto-ceph-create", "SKILL.md"), "# auto ceph create\n");
  write(path.join(rootDir, ".codex", "skills", "auto-ceph-approval", "SKILL.md"), "# auto ceph approval\n");
  write(path.join(rootDir, ".codex", "skills", "auto-ceph-e2e", "SKILL.md"), "# auto ceph e2e\n");
}

function runCli(args) {
  return spawnSync(
    process.execPath,
    [path.join(__dirname, "..", "bin", "auto-ceph-work.js"), ...args],
    { encoding: "utf8" }
  );
}

function runScript(scriptPath, args, cwd, env) {
  return spawnSync("bash", [scriptPath, ...args], {
    cwd,
    env: env || process.env,
    encoding: "utf8",
  });
}

function runShell(command, cwd) {
  return spawnSync("bash", ["-lc", command], {
    cwd,
    encoding: "utf8",
  });
}

function runNode(scriptPath, args, cwd, env) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("cli install routes to the installer and uses package version by default", () => {
  const sourceRoot = makeTempDir("aceph-cli-source-");
  makeSourceTree(sourceRoot);
  const projectRoot = makeTempDir("aceph-cli-project-");

  const result = runCli(["install", "--project", projectRoot, "--source", sourceRoot]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /command: install/);
  assert.match(result.stdout, new RegExp(`version: ${packageVersion.replace(/\./g, "\\.")}`));
  assert.ok(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "install.json")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "project.json")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".codex", "agents", "aceph-ticket-intake.toml")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".codex", "commands", "aceph", "next.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".codex", "skills", "auto-ceph", "SKILL.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".codex", "skills", "auto-ceph-create", "SKILL.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".codex", "skills", "auto-ceph-approval", "SKILL.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".codex", "skills", "auto-ceph-e2e", "SKILL.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".codex", "hooks.json")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "templates", "03_PLAN.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "scripts", "select_e2e_cases.js")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "scripts", "update_jira_ticket_time_note.js")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "references", "e2e-jira-ticket-template.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "references", "e2e-execution-contract.md")));
  assert.equal(fs.existsSync(path.join(projectRoot, "doc", "_templates")), false);
  assert.equal(fs.existsSync(path.join(projectRoot, "scripts", "new-ticket-doc.sh")), false);
  assert.equal(fs.existsSync(path.join(projectRoot, ".auto-ceph-work.json")), false);

  const metadata = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".auto-ceph-work", "install.json"), "utf8")
  );
  assert.equal(metadata.version, packageVersion);
  assert.equal(metadata.managed_hooks_path, ".codex/hooks.json");
});

test("cli prints package command usage on invalid input", () => {
  const result = runCli(["deploy"]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unsupported command: deploy/);
  assert.match(result.stderr, /auto-ceph-work install/);
});

test("create_ticket_docs script succeeds even when new-ticket-doc.sh is not executable", () => {
  const rootDir = makeTempDir("aceph-docs-root-");
  write(path.join(rootDir, ".auto-ceph-work", "project.json"), JSON.stringify({
    version: 1,
    workflow: "auto-ceph-ticket-loop",
    docs_root: ".auto-ceph-work/tickets",
    ticket_root_pattern: ".auto-ceph-work/tickets/<TICKET-ID>",
  }, null, 2));
  write(path.join(rootDir, ".auto-ceph-work", "templates", "01_TICKET.md"), "# [TICKET-ID]\n");
  write(path.join(rootDir, ".auto-ceph-work", "templates", "02_CONTEXT.md"), "# [TICKET-ID]\n");
  write(path.join(rootDir, ".auto-ceph-work", "templates", "03_PLAN.md"), "# [TICKET-ID]\n- 목표:\n- 성공 기준:\n기준 브랜치: dev\n");
  write(path.join(rootDir, ".auto-ceph-work", "templates", "04_EXECUTION.md"), "# [TICKET-ID]\n- 수행 내용:\n");
  write(path.join(rootDir, ".auto-ceph-work", "templates", "05_UAT.md"), "# [TICKET-ID]\n");
  write(path.join(rootDir, ".auto-ceph-work", "templates", "06_REVIEW.md"), "# [TICKET-ID]\n");
  write(path.join(rootDir, ".auto-ceph-work", "templates", "07_SUMMARY.md"), "# [TICKET-ID]\n");
  write(path.join(rootDir, ".auto-ceph-work", "templates", "08_LOOP.md"), "# [TICKET-ID]\n");
  write(
    path.join(rootDir, ".auto-ceph-work", "scripts", "new-ticket-doc.sh"),
    fs.readFileSync(path.join(__dirname, "..", ".auto-ceph-work", "scripts", "new-ticket-doc.sh"), "utf8")
  );
  write(
    path.join(rootDir, ".auto-ceph-work", "scripts", "create_ticket_docs.sh"),
    fs.readFileSync(path.join(__dirname, "..", ".auto-ceph-work", "scripts", "create_ticket_docs.sh"), "utf8")
  );
  fs.chmodSync(path.join(rootDir, ".auto-ceph-work", "scripts", "new-ticket-doc.sh"), 0o644);

  const result = runScript(
    path.join(rootDir, ".auto-ceph-work", "scripts", "create_ticket_docs.sh"),
    ["CDS-2135"],
    rootDir
  );

  assert.equal(result.status, 0, result.stderr);
  for (const fileName of ["01_TICKET.md", "02_CONTEXT.md", "03_PLAN.md", "04_EXECUTION.md", "05_UAT.md", "06_REVIEW.md", "07_SUMMARY.md", "08_LOOP.md"]) {
    const created = ticketPath(rootDir, "CDS-2135", fileName);
    assert.ok(fs.existsSync(created), created);
    assert.match(fs.readFileSync(created, "utf8"), /CDS-2135/);
  }
});

test("resolve_ticket_context extracts remote from 01_TICKET.md", () => {
  const rootDir = makeTempDir("ceph-service-api-");
  write(
    ticketPath(rootDir, "CDS-2135", "01_TICKET.md"),
    "# TICKET\n\n- repo: ceph-service-api\n- remote: origin\n"
  );
  write(
    path.join(rootDir, ".auto-ceph-work", "scripts", "resolve_ticket_context.sh"),
    fs.readFileSync(path.join(__dirname, "..", ".auto-ceph-work", "scripts", "resolve_ticket_context.sh"), "utf8")
  );

  const result = runScript(
    path.join(rootDir, ".auto-ceph-work", "scripts", "resolve_ticket_context.sh"),
    ["CDS-2135"],
    rootDir
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^repo='ceph-service-api'$/m);
  assert.match(result.stdout, /^project_repo='ceph-service-api-[^']+'$/m);
  assert.match(result.stdout, /^remote='origin'$/m);
  assert.match(result.stdout, /^ticket_branch='feature\/CDS-2135'$/m);
  assert.match(result.stdout, /^base_branch='dev'$/m);
});

test("resolve_atlassian_identity extracts JIRA_USERNAME from Codex config", () => {
  const rootDir = makeTempDir("aceph-atlassian-identity-root-");
  const codexHome = path.join(rootDir, ".codex-home");
  write(
    path.join(codexHome, "config.toml"),
    [
      'model = "gpt-5.4"',
      "",
      "[mcp_servers.mcp-atlassian]",
      'command = "uvx"',
      "",
      "[mcp_servers.mcp-atlassian.env]",
      'JIRA_URL = "https://okestro.atlassian.net"',
      'JIRA_USERNAME = "hj.yun@okestro.com"',
      "",
    ].join("\n")
  );
  write(
    path.join(rootDir, ".auto-ceph-work", "scripts", "resolve_atlassian_identity.sh"),
    fs.readFileSync(path.join(__dirname, "..", ".auto-ceph-work", "scripts", "resolve_atlassian_identity.sh"), "utf8")
  );

  const result = spawnSync(
    "bash",
    [path.join(rootDir, ".auto-ceph-work", "scripts", "resolve_atlassian_identity.sh")],
    {
      cwd: rootDir,
      env: { ...process.env, CODEX_HOME: codexHome },
      encoding: "utf8",
    }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^jira_username='hj\.yun@okestro\.com'$/m);
  assert.match(result.stdout, new RegExp(`^config_file='${codexHome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\/config\\.toml'$`, "m"));
});

test("resolve_atlassian_identity returns empty username when config is missing", () => {
  const rootDir = makeTempDir("aceph-atlassian-identity-missing-root-");
  const codexHome = path.join(rootDir, ".codex-home");
  write(
    path.join(rootDir, ".auto-ceph-work", "scripts", "resolve_atlassian_identity.sh"),
    fs.readFileSync(path.join(__dirname, "..", ".auto-ceph-work", "scripts", "resolve_atlassian_identity.sh"), "utf8")
  );

  const result = spawnSync(
    "bash",
    [path.join(rootDir, ".auto-ceph-work", "scripts", "resolve_atlassian_identity.sh")],
    {
      cwd: rootDir,
      env: { ...process.env, CODEX_HOME: codexHome },
      encoding: "utf8",
    }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^config_not_found=1$/m);
  assert.match(result.stdout, /^jira_username=''$/m);
});

test("select_e2e_cases helper lists menu1 values and returns selected compact cases", () => {
  const helper = path.join(__dirname, "..", ".auto-ceph-work", "scripts", "select_e2e_cases.js");
  const targetCase = path.join(__dirname, "..", ".auto-ceph-work", "references", "test-case", "v306.json");

  const menuList = runNode(helper, ["menu-list", targetCase], path.join(__dirname, ".."));
  assert.equal(menuList.status, 0, menuList.stderr);
  const menus = JSON.parse(menuList.stdout).menus;
  assert.equal(menus.length, 12);
  assert.ok(menus.includes("블록"));

  const selected = runNode(helper, ["select", targetCase, "블록"], path.join(__dirname, ".."));
  assert.equal(selected.status, 0, selected.stderr);
  const selectedCases = JSON.parse(selected.stdout);
  assert.equal(selectedCases.menu1, "블록");
  assert.ok(selectedCases.features.length > 0);
  for (const feature of selectedCases.features) {
    assert.deepEqual(Object.keys(feature).sort(), ["category", "feature_name", "steps"]);
    for (const step of feature.steps) {
      assert.equal(step.menu_path[0], "블록");
      assert.deepEqual(Object.keys(step).sort(), ["expected_result", "menu_path", "procedure"]);
    }
  }

  const missing = runNode(helper, ["select", targetCase, "없는 메뉴"], path.join(__dirname, ".."));
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /no test cases found/);

  const rootDir = makeTempDir("aceph-e2e-cases-");
  const malformed = path.join(rootDir, "bad.json");
  write(malformed, "{bad");
  const invalid = runNode(helper, ["menu-list", malformed], rootDir);
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /failed to read or parse target case JSON/);
});

test("create_or_reuse_merge_request helper reuses an existing open MR", () => {
  const rootDir = makeTempDir("aceph-mr-reuse-");
  const summaryFile = path.join(rootDir, "07_SUMMARY.md");
  const logFile = path.join(rootDir, "glab.log");
  const mockGlab = path.join(rootDir, "mock-glab.sh");

  write(summaryFile, "# summary\n");
  write(
    mockGlab,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "printf '%s\\n' \"$*\" >> \"$GLAB_LOG\"",
      "if [ \"$1\" = \"mr\" ] && [ \"$2\" = \"list\" ]; then",
      "  cat <<'EOF'",
      '[{"title":"CDS-2135 API 응답 수정","web_url":"https://gitlab.example.com/group/proj/-/merge_requests/12","source_branch":"feature/CDS-2135","target_branch":"dev"}]',
      "EOF",
      "  exit 0",
      "fi",
      "echo unexpected >&2",
      "exit 1",
      "",
    ].join("\n")
  );
  fs.chmodSync(mockGlab, 0o755);

  const result = runNode(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "create_or_reuse_merge_request.js"),
    ["CDS-2135", "feature/CDS-2135", "dev", "CDS-2135 API 응답 수정", summaryFile],
    rootDir,
    { GLAB_BIN: mockGlab, GLAB_LOG: logFile }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^status=reused$/m);
  assert.match(result.stdout, /^title=CDS-2135 API 응답 수정$/m);
  assert.match(result.stdout, /^url=https:\/\/gitlab\.example\.com\/group\/proj\/-\/merge_requests\/12$/m);
  assert.match(result.stdout, /^source=feature\/CDS-2135$/m);
  assert.match(result.stdout, /^target=dev$/m);
  assert.doesNotMatch(fs.readFileSync(logFile, "utf8"), /^mr create /m);
});

test("create_or_reuse_merge_request helper creates an MR when none exists", () => {
  const rootDir = makeTempDir("aceph-mr-create-");
  const summaryFile = path.join(rootDir, "07_SUMMARY.md");
  const stateFile = path.join(rootDir, "state.txt");
  const logFile = path.join(rootDir, "glab.log");
  const mockGlab = path.join(rootDir, "mock-glab.sh");

  write(summaryFile, "# summary\n");
  write(
    mockGlab,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "printf '%s\\n' \"$*\" >> \"$GLAB_LOG\"",
      "if [ \"$1\" = \"mr\" ] && [ \"$2\" = \"list\" ]; then",
      "  if [ ! -f \"$STATE_FILE\" ]; then",
      "    echo '[]'",
      "  else",
      "    cat <<'EOF'",
      '[{"title":"CDS-2135 API 응답 수정","web_url":"https://gitlab.example.com/group/proj/-/merge_requests/13","source_branch":"feature/CDS-2135","target_branch":"dev"}]',
      "EOF",
      "  fi",
      "  exit 0",
      "fi",
      "if [ \"$1\" = \"mr\" ] && [ \"$2\" = \"create\" ]; then",
      "  touch \"$STATE_FILE\"",
      "  echo created",
      "  exit 0",
      "fi",
      "echo unexpected >&2",
      "exit 1",
      "",
    ].join("\n")
  );
  fs.chmodSync(mockGlab, 0o755);

  const result = runNode(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "create_or_reuse_merge_request.js"),
    ["CDS-2135", "feature/CDS-2135", "dev", "CDS-2135 API 응답 수정", summaryFile],
    rootDir,
    { GLAB_BIN: mockGlab, GLAB_LOG: logFile, STATE_FILE: stateFile }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^status=created$/m);
  assert.match(result.stdout, /^url=https:\/\/gitlab\.example\.com\/group\/proj\/-\/merge_requests\/13$/m);
  assert.match(fs.readFileSync(logFile, "utf8"), /^mr create /m);
});

test("create_or_reuse_merge_request helper fails on malformed glab list output", () => {
  const rootDir = makeTempDir("aceph-mr-malformed-");
  const summaryFile = path.join(rootDir, "07_SUMMARY.md");
  const mockGlab = path.join(rootDir, "mock-glab.sh");

  write(summaryFile, "# summary\n");
  write(
    mockGlab,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "if [ \"$1\" = \"mr\" ] && [ \"$2\" = \"list\" ]; then",
      "  echo 'not-json'",
      "  exit 0",
      "fi",
      "echo unexpected >&2",
      "exit 1",
      "",
    ].join("\n")
  );
  fs.chmodSync(mockGlab, 0o755);

  const result = runNode(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "create_or_reuse_merge_request.js"),
    ["CDS-2135", "feature/CDS-2135", "dev", "CDS-2135 API 응답 수정", summaryFile],
    rootDir,
    { GLAB_BIN: mockGlab }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /failed to parse glab mr list output/);
});

test("approve_and_merge_review_mr helper approves and merges an open MR", () => {
  const rootDir = makeTempDir("aceph-mr-approve-");
  const logFile = path.join(rootDir, "glab.log");
  const stateFile = path.join(rootDir, "merge-state.txt");
  const mockGlab = path.join(rootDir, "mock-glab.sh");

  write(
    mockGlab,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "printf '%s\\n' \"$*\" >> \"$GLAB_LOG\"",
      "if [ \"$1\" = \"mr\" ] && [ \"$2\" = \"list\" ]; then",
      "  cat <<'EOF'",
      '[{"iid":"12","title":"CDS-2135 API 응답 수정","web_url":"https://gitlab.example.com/group/proj/-/merge_requests/12","source_branch":"feature/CDS-2135","target_branch":"dev","state":"opened"}]',
      "EOF",
      "  exit 0",
      "fi",
      "if [ \"$1\" = \"mr\" ] && [ \"$2\" = \"approve\" ]; then",
      "  echo approved",
      "  exit 0",
      "fi",
      "if [ \"$1\" = \"mr\" ] && [ \"$2\" = \"merge\" ]; then",
      "  if [ ! -f \"$STATE_FILE\" ]; then",
      "    touch \"$STATE_FILE\"",
      "    echo not-ready >&2",
      "    exit 1",
      "  fi",
      "  echo merged",
      "  exit 0",
      "fi",
      "if [ \"$1\" = \"mr\" ] && [ \"$2\" = \"view\" ]; then",
      "  cat <<'EOF'",
      '{"state":"merged","title":"CDS-2135 API 응답 수정","web_url":"https://gitlab.example.com/group/proj/-/merge_requests/12","source_branch":"feature/CDS-2135","target_branch":"dev"}',
      "EOF",
      "  exit 0",
      "fi",
      "echo unexpected >&2",
      "exit 1",
      "",
    ].join("\n")
  );
  fs.chmodSync(mockGlab, 0o755);

  const result = runNode(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "approve_and_merge_review_mr.js"),
    ["CDS-2135", "feature/CDS-2135", "dev"],
    rootDir,
    {
      GLAB_BIN: mockGlab,
      GLAB_LOG: logFile,
      STATE_FILE: stateFile,
      MR_MERGE_TIMEOUT_MS: "50",
      MR_MERGE_RETRY_INTERVAL_MS: "1",
    }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^status=merged$/m);
  assert.match(result.stdout, /^url=https:\/\/gitlab\.example\.com\/group\/proj\/-\/merge_requests\/12$/m);
  const log = fs.readFileSync(logFile, "utf8");
  assert.match(log, /^mr list --source-branch feature\/CDS-2135 --target-branch dev -F json$/m);
  assert.match(log, /^mr approve /m);
  assert.match(log, /^mr merge /m);
  assert.match(log, /^mr view .* -F json$/m);
});

test("approve_and_merge_review_mr helper fails when merge never becomes possible", () => {
  const rootDir = makeTempDir("aceph-mr-approve-timeout-");
  const mockGlab = path.join(rootDir, "mock-glab.sh");

  write(
    mockGlab,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "if [ \"$1\" = \"mr\" ] && [ \"$2\" = \"list\" ]; then",
      "  cat <<'EOF'",
      '[{"iid":"12","title":"CDS-2135 API 응답 수정","web_url":"https://gitlab.example.com/group/proj/-/merge_requests/12","source_branch":"feature/CDS-2135","target_branch":"dev","state":"opened"}]',
      "EOF",
      "  exit 0",
      "fi",
      "if [ \"$1\" = \"mr\" ] && [ \"$2\" = \"approve\" ]; then",
      "  echo approved",
      "  exit 0",
      "fi",
      "if [ \"$1\" = \"mr\" ] && [ \"$2\" = \"merge\" ]; then",
      "  echo not-ready >&2",
      "  exit 1",
      "fi",
      "if [ \"$1\" = \"mr\" ] && [ \"$2\" = \"view\" ]; then",
      "  cat <<'EOF'",
      '{"state":"opened","title":"CDS-2135 API 응답 수정","web_url":"https://gitlab.example.com/group/proj/-/merge_requests/12","source_branch":"feature/CDS-2135","target_branch":"dev"}',
      "EOF",
      "  exit 0",
      "fi",
      "echo unexpected >&2",
      "exit 1",
      "",
    ].join("\n")
  );
  fs.chmodSync(mockGlab, 0o755);

  const result = runNode(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "approve_and_merge_review_mr.js"),
    ["CDS-2135", "feature/CDS-2135", "dev"],
    rootDir,
    {
      GLAB_BIN: mockGlab,
      MR_MERGE_TIMEOUT_MS: "10",
      MR_MERGE_RETRY_INTERVAL_MS: "1",
    }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /merge request did not become mergeable before timeout/);
  assert.doesNotMatch(result.stdout, /^status=merged$/m);
});

test("approve_and_merge_review_mr helper rejects missing open MR and approve failure", () => {
  const rootDir = makeTempDir("aceph-mr-approve-failure-");
  const mockGlab = path.join(rootDir, "mock-glab.sh");

  write(
    mockGlab,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "if [ \"$1\" = \"mr\" ] && [ \"$2\" = \"list\" ]; then",
      "  cat <<'EOF'",
      '[{"iid":"12","title":"CDS-2135 API 응답 수정","web_url":"https://gitlab.example.com/group/proj/-/merge_requests/12","source_branch":"feature/CDS-2135","target_branch":"dev","state":"closed"}]',
      "EOF",
      "  exit 0",
      "fi",
      "echo unexpected >&2",
      "exit 1",
      "",
    ].join("\n")
  );
  fs.chmodSync(mockGlab, 0o755);

  let result = runNode(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "approve_and_merge_review_mr.js"),
    ["CDS-2135", "feature/CDS-2135", "dev"],
    rootDir,
    { GLAB_BIN: mockGlab }
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /open merge request not found/);
  assert.doesNotMatch(result.stdout, /^status=merged$/m);

  write(
    mockGlab,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "if [ \"$1\" = \"mr\" ] && [ \"$2\" = \"list\" ]; then",
      "  cat <<'EOF'",
      '[{"iid":"12","title":"CDS-2135 API 응답 수정","web_url":"https://gitlab.example.com/group/proj/-/merge_requests/12","source_branch":"feature/CDS-2135","target_branch":"dev","state":"opened"}]',
      "EOF",
      "  exit 0",
      "fi",
      "if [ \"$1\" = \"mr\" ] && [ \"$2\" = \"approve\" ]; then",
      "  echo approve-failed >&2",
      "  exit 1",
      "fi",
      "echo unexpected >&2",
      "exit 1",
      "",
    ].join("\n")
  );

  result = runNode(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "approve_and_merge_review_mr.js"),
    ["CDS-2135", "feature/CDS-2135", "dev"],
    rootDir,
    { GLAB_BIN: mockGlab }
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /approve-failed/);
  assert.doesNotMatch(result.stdout, /^status=merged$/m);
});

test("prepare_ticket_branch creates and checks out the canonical ticket branch from dev", () => {
  const rootDir = makeTempDir("ceph-service-api-");
  const remoteDir = makeTempDir("ceph-service-api-remote-");

  let result = runShell("git init --bare", remoteDir);
  assert.equal(result.status, 0, result.stderr);

  result = runShell("git init -b dev && git config user.name tester && git config user.email tester@example.com && echo base > README.md && git add README.md && git commit -m init", rootDir);
  assert.equal(result.status, 0, result.stderr);

  result = runShell(`git remote add sds306 "${remoteDir}" && git push -u sds306 dev`, rootDir);
  assert.equal(result.status, 0, result.stderr);

  write(
    path.join(rootDir, ".auto-ceph-work", "scripts", "prepare_ticket_branch.sh"),
    fs.readFileSync(path.join(__dirname, "..", ".auto-ceph-work", "scripts", "prepare_ticket_branch.sh"), "utf8")
  );

  result = runScript(
    path.join(rootDir, ".auto-ceph-work", "scripts", "prepare_ticket_branch.sh"),
    ["CDS-2167", "sds306"],
    rootDir
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^ticket_branch='feature\/CDS-2167'$/m);

  result = runShell("git branch --show-current", rootDir);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "feature/CDS-2167");
});

test("commit_and_push_ticket_branch helper commits tracked changes and pushes to fallback remote", () => {
  const rootDir = makeTempDir("ceph-service-api-");
  const remoteDir = makeTempDir("ceph-service-api-remote-");

  let result = runShell("git init --bare", remoteDir);
  assert.equal(result.status, 0, result.stderr);
  result = runShell("git init -b dev && git config user.name tester && git config user.email tester@example.com && echo base > README.md && git add README.md && git commit -m init", rootDir);
  assert.equal(result.status, 0, result.stderr);
  result = runShell(`git remote add origin "${remoteDir}" && git push -u origin dev`, rootDir);
  assert.equal(result.status, 0, result.stderr);
  result = runShell("git checkout -b feature/CDS-3001 && echo next >> README.md", rootDir);
  assert.equal(result.status, 0, result.stderr);

  result = runScript(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "commit_and_push_ticket_branch.sh"),
    ["CDS-3001", "origin"],
    rootDir
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^commit_performed='yes'$/m);
  assert.match(result.stdout, /^push_target='origin\/feature\/CDS-3001'$/m);
});

test("commit_and_push_ticket_branch helper supports clean push-only and rejects branch mismatch", () => {
  const rootDir = makeTempDir("ceph-service-api-");
  const remoteDir = makeTempDir("ceph-service-api-remote-");

  let result = runShell("git init --bare", remoteDir);
  assert.equal(result.status, 0, result.stderr);
  result = runShell("git init -b dev && git config user.name tester && git config user.email tester@example.com && echo base > README.md && git add README.md && git commit -m init", rootDir);
  assert.equal(result.status, 0, result.stderr);
  result = runShell(`git remote add origin "${remoteDir}" && git push -u origin dev`, rootDir);
  assert.equal(result.status, 0, result.stderr);
  result = runShell("git checkout -b feature/CDS-3002 && git push -u origin feature/CDS-3002", rootDir);
  assert.equal(result.status, 0, result.stderr);

  result = runScript(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "commit_and_push_ticket_branch.sh"),
    ["CDS-3002", "origin"],
    rootDir
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^commit_performed='no'$/m);
  assert.match(result.stdout, /^push_target='upstream'$/m);

  result = runShell("git checkout dev", rootDir);
  assert.equal(result.status, 0, result.stderr);
  result = runScript(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "commit_and_push_ticket_branch.sh"),
    ["CDS-3002", "origin"],
    rootDir
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /post_ticket_branch_mismatch/);
});

test("commit_and_push_ticket_branch helper fails when fallback remote is invalid", () => {
  const rootDir = makeTempDir("ceph-service-api-");
  let result = runShell("git init -b dev && git config user.name tester && git config user.email tester@example.com && echo base > README.md && git add README.md && git commit -m init && git checkout -b feature/CDS-3003 && echo next >> README.md", rootDir);
  assert.equal(result.status, 0, result.stderr);

  result = runScript(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "commit_and_push_ticket_branch.sh"),
    ["CDS-3003", "missing-remote"],
    rootDir
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /remote not found: missing-remote/);
});

test("return_to_dev_branch helper checks out dev and fails when missing", () => {
  const rootDir = makeTempDir("ceph-service-api-");
  let result = runShell("git init -b dev && git config user.name tester && git config user.email tester@example.com && echo base > README.md && git add README.md && git commit -m init && git checkout -b feature/CDS-3004", rootDir);
  assert.equal(result.status, 0, result.stderr);

  result = runScript(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "return_to_dev_branch.sh"),
    [],
    rootDir
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^current_branch='dev'$/m);

  const missingRoot = makeTempDir("ceph-service-api-");
  result = runShell("git init -b main && git config user.name tester && git config user.email tester@example.com && echo base > README.md && git add README.md && git commit -m init", missingRoot);
  assert.equal(result.status, 0, result.stderr);
  result = runScript(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "return_to_dev_branch.sh"),
    [],
    missingRoot
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /dev branch not found/);
});

test("run_trombone_pipeline helper validates config and waits for completion", () => {
  const rootDir = makeTempDir("aceph-trombone-run-");
  const configFile = path.join(rootDir, "trombone-config.md");
  const logFile = path.join(rootDir, "pwcli.log");
  const mockPwcli = path.join(rootDir, "mock-pwcli.sh");

  write(
    configFile,
    [
      "repo: auto-ceph",
      "pipeline_prefix: dev-sds-3.0.6-",
      "login_url: http://prd.console.trombone.okestro.cloud/login",
      "id: hj.yun",
      "pw: wldhel11@#",
      "",
    ].join("\n")
  );
  write(
    mockPwcli,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "printf '%s\\n' \"$*\" >> \"$PWCLI_LOG\"",
      "if [ \"$1\" = \"run-code\" ] && [ \"${2:-}\" = \"--help\" ]; then",
      "  echo help",
      "  exit 0",
      "fi",
      "if [ \"${3:-}\" = \"run-code\" ] && [ \"${4:-}\" = \"--filename\" ]; then",
      "  cat \"$5\" >> \"$PWCLI_LOG\"",
      "fi",
      "exit 0",
      "",
    ].join("\n")
  );
  fs.chmodSync(mockPwcli, 0o755);

  const result = runScript(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "run_trombone_pipeline.sh"),
    ["auto-ceph", configFile],
    rootDir,
    { ...process.env, PWCLI_BIN: mockPwcli, PWCLI_LOG: logFile }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^status=completed$/m);
  assert.match(result.stdout, /^pipeline=dev-sds-3\.0\.6-auto-ceph$/m);
  const log = fs.readFileSync(logFile, "utf8");
  const escapedRootDir = rootDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(log, /run-code --help/);
  assert.match(log, /--session acw-autoceph-[0-9]+ open http:\/\/prd\.console\.trombone\.okestro\.cloud\/login/);
  assert.match(log, /--session acw-autoceph-[0-9]+ run-code --filename /);
  assert.match(log, new RegExp(`${escapedRootDir}\\/\\.auto-ceph-work\\/tmp\\/auto-ceph-trombone\\.[A-Za-z0-9]+\\.js`));
  assert.doesNotMatch(log, /\/T\/auto-ceph-trombone\.[A-Za-z0-9]+\.js/);
  assert.match(log, /async \(page\) =>/);
  assert.match(log, /const pipelineName = pipelinePrefix \+ repo/);
  assert.match(log, /waitForRowButtonText\(row, "중지", 60 \* 1000, "pipeline start"\)/);
  assert.match(log, /waitForRowButtonText\(row, "실행", 30 \* 60 \* 1000, "pipeline stop"\)/);
  assert.match(log, /await row\.click\(\)/);
  assert.match(log, /파이프라인 실행이력/);
  assert.match(log, /로그수집여부/);
  assert.match(log, /firstRow\.status === "성공" && firstRow\.logCollection === "수집"/);
  assert.match(log, /firstRow\.status === "성공" && firstRow\.logCollection === "미수집"/);
  assert.match(log, /page\.reload\(\{ waitUntil: "domcontentloaded" \}\)/);
  assert.match(log, /trombone deployment failed/);
  assert.match(log, /pipeline history completion timeout/);
  assert.doesNotMatch(log, /wldhel11@#/);
});

test("run_trombone_pipeline helper fails without completed status on playwright errors", () => {
  const rootDir = makeTempDir("aceph-trombone-pw-fail-");
  const configFile = path.join(rootDir, "trombone-config.md");
  const mockPwcli = path.join(rootDir, "mock-pwcli.sh");

  write(
    configFile,
    [
      "repo: auto-ceph",
      "pipeline_prefix: dev-sds-3.0.6-",
      "login_url: http://prd.console.trombone.okestro.cloud/login",
      "id: hj.yun",
      "pw: wldhel11@#",
      "",
    ].join("\n")
  );
  write(
    mockPwcli,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "if [ \"$1\" = \"run-code\" ] && [ \"${2:-}\" = \"--help\" ]; then",
      "  exit 0",
      "fi",
      "if [ \"${3:-}\" = \"run-code\" ]; then",
      "  echo '### Error'",
      "  echo 'TimeoutError: failed'",
      "  exit 0",
      "fi",
      "exit 0",
      "",
    ].join("\n")
  );
  fs.chmodSync(mockPwcli, 0o755);

  const result = runScript(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "run_trombone_pipeline.sh"),
    ["auto-ceph", configFile],
    rootDir,
    { ...process.env, PWCLI_BIN: mockPwcli }
  );

  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stdout, /^status=completed$/m);
  assert.match(result.stdout, /TimeoutError: failed/);
});

test("run_trombone_pipeline helper fails when config is missing or mismatched", () => {
  const rootDir = makeTempDir("aceph-trombone-fail-");
  const configFile = path.join(rootDir, "trombone-config.md");
  const mockPwcli = path.join(rootDir, "mock-pwcli.sh");

  write(
    mockPwcli,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "exit 0",
      "",
    ].join("\n")
  );
  fs.chmodSync(mockPwcli, 0o755);

  let result = runScript(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "run_trombone_pipeline.sh"),
    ["auto-ceph", path.join(rootDir, "missing.md")],
    rootDir,
    { ...process.env, PWCLI_BIN: mockPwcli }
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /trombone config not found/);

  write(
    configFile,
    [
      "repo: other-repo",
      "pipeline_prefix: dev-sds-3.0.6-",
      "login_url: http://prd.console.trombone.okestro.cloud/login",
      "id: hj.yun",
      "pw: wldhel11@#",
      "",
    ].join("\n")
  );

  result = runScript(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "run_trombone_pipeline.sh"),
    ["auto-ceph", configFile],
    rootDir,
    { ...process.env, PWCLI_BIN: mockPwcli }
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /trombone config repo mismatch/);
});

test("detect_ticket_stage stays at intake when remote is missing", () => {
  const rootDir = makeTempDir("aceph-stage-root-");
  write(
    ticketPath(rootDir, "CDS-2135", "01_TICKET.md"),
    "# TICKET\n\n- repo: ceph-service-api\n- branch: feature/demo\n- endpoint: /health\n"
  );
  write(
    ticketPath(rootDir, "CDS-2135", "02_CONTEXT.md"),
    "# CONTEXT\n\nplaceholder\n"
  );
  write(
    path.join(rootDir, ".auto-ceph-work", "scripts", "detect_ticket_stage.sh"),
    fs.readFileSync(path.join(__dirname, "..", ".auto-ceph-work", "scripts", "detect_ticket_stage.sh"), "utf8")
  );

  const result = runScript(
    path.join(rootDir, ".auto-ceph-work", "scripts", "detect_ticket_stage.sh"),
    ["CDS-2135"],
    rootDir
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "문제 확인");
});

test("detect_ticket_stage advances past intake when repo and remote exist", () => {
  const rootDir = makeTempDir("aceph-stage-advance-root-");
  write(
    ticketPath(rootDir, "CDS-2135", "01_TICKET.md"),
    "# TICKET\n\n- repo: ceph-service-api\n- remote: origin\n"
  );
  write(
    ticketPath(rootDir, "CDS-2135", "02_CONTEXT.md"),
    "# CONTEXT\n\n## 메타 정보\n\n- 단계: 문제 검토\n\n### 구현 대상\n\n- item\n\n### 검증 포인트\n\n- item\n"
  );
  write(
    path.join(rootDir, ".auto-ceph-work", "scripts", "detect_ticket_stage.sh"),
    fs.readFileSync(path.join(__dirname, "..", ".auto-ceph-work", "scripts", "detect_ticket_stage.sh"), "utf8")
  );

  const result = runScript(
    path.join(rootDir, ".auto-ceph-work", "scripts", "detect_ticket_stage.sh"),
    ["CDS-2135"],
    rootDir
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "계획");
});

test("detect_ticket_stage enters code review after validation when review doc is missing", () => {
  const rootDir = makeTempDir("aceph-stage-code-review-root-");
  write(
    ticketPath(rootDir, "CDS-2135", "01_TICKET.md"),
    "# TICKET\n\n- repo: ceph-service-api\n- remote: origin\n"
  );
  write(
    ticketPath(rootDir, "CDS-2135", "02_CONTEXT.md"),
    "# CONTEXT\n\n### 구현 대상\n\n- item\n\n### 검증 포인트\n\n- item\n"
  );
  write(ticketPath(rootDir, "CDS-2135", "03_PLAN.md"), "# PLAN\n- 목표: test\n- 성공 기준: ok\n기준 브랜치: dev\n");
  write(ticketPath(rootDir, "CDS-2135", "04_EXECUTION.md"), "# EXECUTION\n- 수행 내용: test\n");
  write(ticketPath(rootDir, "CDS-2135", "05_UAT.md"), "# UAT\n- 최종 판단: passed\n");
  write(
    path.join(rootDir, ".auto-ceph-work", "scripts", "detect_ticket_stage.sh"),
    fs.readFileSync(path.join(__dirname, "..", ".auto-ceph-work", "scripts", "detect_ticket_stage.sh"), "utf8")
  );

  const result = runScript(
    path.join(rootDir, ".auto-ceph-work", "scripts", "detect_ticket_stage.sh"),
    ["CDS-2135"],
    rootDir
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "코드 리뷰");
});

test("detect_ticket_stage enters review request after code review passes", () => {
  const rootDir = makeTempDir("aceph-stage-review-request-root-");
  write(
    ticketPath(rootDir, "CDS-2135", "01_TICKET.md"),
    "# TICKET\n\n- repo: ceph-service-api\n- remote: origin\n"
  );
  write(
    ticketPath(rootDir, "CDS-2135", "02_CONTEXT.md"),
    "# CONTEXT\n\n### 구현 대상\n\n- item\n\n### 검증 포인트\n\n- item\n"
  );
  write(ticketPath(rootDir, "CDS-2135", "03_PLAN.md"), "# PLAN\n- 목표: test\n- 성공 기준: ok\n기준 브랜치: dev\n");
  write(ticketPath(rootDir, "CDS-2135", "04_EXECUTION.md"), "# EXECUTION\n- 수행 내용: test\n");
  write(ticketPath(rootDir, "CDS-2135", "05_UAT.md"), "# UAT\n- 최종 판단: passed\n");
  write(ticketPath(rootDir, "CDS-2135", "06_REVIEW.md"), "# REVIEW\n- 결과: approved\n");
  write(
    path.join(rootDir, ".auto-ceph-work", "scripts", "detect_ticket_stage.sh"),
    fs.readFileSync(path.join(__dirname, "..", ".auto-ceph-work", "scripts", "detect_ticket_stage.sh"), "utf8")
  );

  const result = runScript(
    path.join(rootDir, ".auto-ceph-work", "scripts", "detect_ticket_stage.sh"),
    ["CDS-2135"],
    rootDir
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "리뷰 요청");
});

test("detect_ticket_stage stays at review request when merge request metadata is missing", () => {
  const rootDir = makeTempDir("aceph-stage-review-request-mr-missing-root-");
  write(
    ticketPath(rootDir, "CDS-2135", "01_TICKET.md"),
    "# TICKET\n\n- repo: ceph-service-api\n- remote: origin\n"
  );
  write(
    ticketPath(rootDir, "CDS-2135", "02_CONTEXT.md"),
    "# CONTEXT\n\n### 구현 대상\n\n- item\n\n### 검증 포인트\n\n- item\n"
  );
  write(ticketPath(rootDir, "CDS-2135", "03_PLAN.md"), "# PLAN\n- 목표: test\n- 성공 기준: ok\n기준 브랜치: dev\n");
  write(ticketPath(rootDir, "CDS-2135", "04_EXECUTION.md"), "# EXECUTION\n- 수행 내용: test\n");
  write(ticketPath(rootDir, "CDS-2135", "05_UAT.md"), "# UAT\n- 최종 판단: passed\n");
  write(ticketPath(rootDir, "CDS-2135", "06_REVIEW.md"), "# REVIEW\n- 결과: approved\n");
  write(
    ticketPath(rootDir, "CDS-2135", "07_SUMMARY.md"),
    [
      "# SUMMARY",
      "",
      "- 주요 변경 1: test",
      "",
      "## Merge Request",
      "",
      "- 상태:",
      "- 제목:",
      "- URL:",
      "- source:",
      "- target:",
      "",
    ].join("\n")
  );
  write(
    path.join(rootDir, ".auto-ceph-work", "scripts", "detect_ticket_stage.sh"),
    fs.readFileSync(path.join(__dirname, "..", ".auto-ceph-work", "scripts", "detect_ticket_stage.sh"), "utf8")
  );

  const result = runScript(
    path.join(rootDir, ".auto-ceph-work", "scripts", "detect_ticket_stage.sh"),
    ["CDS-2135"],
    rootDir
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "리뷰 요청");
});

test("detect_ticket_stage marks complete when merge request metadata is present", () => {
  const rootDir = makeTempDir("aceph-stage-complete-root-");
  write(
    ticketPath(rootDir, "CDS-2135", "01_TICKET.md"),
    "# TICKET\n\n- repo: ceph-service-api\n- remote: origin\n"
  );
  write(
    ticketPath(rootDir, "CDS-2135", "02_CONTEXT.md"),
    "# CONTEXT\n\n### 구현 대상\n\n- item\n\n### 검증 포인트\n\n- item\n"
  );
  write(ticketPath(rootDir, "CDS-2135", "03_PLAN.md"), "# PLAN\n- 목표: test\n- 성공 기준: ok\n기준 브랜치: dev\n");
  write(ticketPath(rootDir, "CDS-2135", "04_EXECUTION.md"), "# EXECUTION\n- 수행 내용: test\n");
  write(ticketPath(rootDir, "CDS-2135", "05_UAT.md"), "# UAT\n- 최종 판단: passed\n");
  write(ticketPath(rootDir, "CDS-2135", "06_REVIEW.md"), "# REVIEW\n- 결과: approved\n");
  write(
    ticketPath(rootDir, "CDS-2135", "07_SUMMARY.md"),
    [
      "# SUMMARY",
      "",
      "- 주요 변경 1: test",
      "",
      "## Merge Request",
      "",
      "- 상태: created",
      "- 제목: CDS-2135 API 응답 수정",
      "- URL: https://gitlab.example.com/group/proj/-/merge_requests/12",
      "- source: feature/CDS-2135",
      "- target: dev",
      "",
    ].join("\n")
  );
  write(
    path.join(rootDir, ".auto-ceph-work", "scripts", "detect_ticket_stage.sh"),
    fs.readFileSync(path.join(__dirname, "..", ".auto-ceph-work", "scripts", "detect_ticket_stage.sh"), "utf8")
  );

  const result = runScript(
    path.join(rootDir, ".auto-ceph-work", "scripts", "detect_ticket_stage.sh"),
    ["CDS-2135"],
    rootDir
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "완료");
});

test("cli install does not install a Stop hook or run-state helper", () => {
  const sourceRoot = makeTempDir("aceph-cli-source-no-stop-");
  makeSourceTree(sourceRoot);
  const projectRoot = makeTempDir("aceph-cli-project-no-stop-");

  const result = runCli(["install", "--project", projectRoot, "--source", sourceRoot]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(projectRoot, ".codex", "hooks", "aceph-stop-continue.js")), false);
  assert.equal(fs.existsSync(path.join(projectRoot, ".codex", "hooks", "lib", "run-state.js")), false);

  const config = fs.readFileSync(path.join(projectRoot, ".codex", "config.toml"), "utf8");
  assert.doesNotMatch(config, /event = "Stop"/);
  assert.doesNotMatch(config, /\[\[hooks\]\]/);
  assert.doesNotMatch(config, /aceph-stop-continue\.js/);

  const hooksJson = JSON.parse(fs.readFileSync(path.join(projectRoot, ".codex", "hooks.json"), "utf8"));
  const commands = hooksJson.hooks.PreToolUse.flatMap((entry) => entry.hooks || []).map((hook) => hook.command);
  assert.doesNotMatch(commands.join("\n"), /aceph-stop-continue\.js/);
});

test("format_jira_note script renders a start block for description work notes", () => {
  const result = runScript(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "format_jira_note.sh"),
    ["start", "계획"],
    path.join(__dirname, "..")
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^#### 계획/m);
  assert.match(result.stdout, /^- 시작$/m);
});

test("format_jira_note script renders a stage summary block for description work notes", () => {
  const rootDir = makeTempDir("aceph-jira-note-summary-");
  const artifactPath = path.join(rootDir, "03_PLAN.md");
  write(
    artifactPath,
    [
      "# CDS-2135 Plan",
      "",
      "## 메타 정보",
      "",
      "- 단계: 계획",
      "",
      "## 실행 계획",
      "",
      "### Task 1",
      "",
      "- 목표: 응답 수정",
      "- 대상 파일: src/a.ts",
      "",
      "## 검증 계획",
      "",
      "- 테스트 항목: unit",
      "- 성공 기준: pass",
      "",
      "## 검증 Unblock 정책",
      "",
      "- 최소 수정만 허용",
      "",
    ].join("\n")
  );
  const result = runScript(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "format_jira_note.sh"),
    ["summary", "계획", "CDS-2135", artifactPath, "수행 진행", "없음"],
    rootDir
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^#### 계획/m);
  assert.match(result.stdout, /^- 티켓: CDS-2135$/m);
  assert.match(result.stdout, new RegExp(`^- 산출물: ${artifactPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
  assert.match(result.stdout, /- 실행 계획:/);
  assert.match(result.stdout, /  ### Task 1/);
  assert.match(result.stdout, /  - 목표: 응답 수정/);
  assert.match(result.stdout, /- 검증 계획:/);
  assert.match(result.stdout, /  - 테스트 항목: unit/);
  assert.match(result.stdout, /- 검증 Unblock 정책:/);
  assert.match(result.stdout, /  - 최소 수정만 허용/);
  assert.match(result.stdout, /^- 다음 액션: 수행 진행$/m);
  assert.match(result.stdout, /^- blocker: 없음$/m);
});

test("format_jira_note script includes merge request metadata for review request summaries", () => {
  const rootDir = makeTempDir("aceph-jira-note-review-request-");
  const artifactPath = path.join(rootDir, "07_SUMMARY.md");
  write(
    artifactPath,
    [
      "# CDS-2135 Review Summary",
      "",
      "## 메타 정보",
      "",
      "- 단계: 리뷰 요청",
      "",
      "## 변경 사항",
      "",
      "- 주요 변경 1: 응답 수정",
      "",
      "## 검증 결과",
      "",
      "- 테스트: pass",
      "",
      "## 코드 리뷰 결과",
      "",
      "- 판정: approved",
      "",
      "## Merge Request",
      "",
      "- 상태: reused",
      "- 제목: CDS-2135 API 응답 수정",
      "- URL: https://gitlab.example.com/group/proj/-/merge_requests/12",
      "- source: feature/CDS-2135",
      "- target: dev",
      "",
    ].join("\n")
  );

  const result = runScript(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "format_jira_note.sh"),
    ["summary", "리뷰 요청", "CDS-2135", artifactPath, "종료", "없음"],
    rootDir
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /- Merge Request:/);
  assert.match(result.stdout, /  - 상태: reused/);
  assert.match(result.stdout, /  - 제목: CDS-2135 API 응답 수정/);
  assert.match(result.stdout, /  - URL: https:\/\/gitlab\.example\.com\/group\/proj\/-\/merge_requests\/12/);
  assert.match(result.stdout, /  - source: feature\/CDS-2135/);
  assert.match(result.stdout, /  - target: dev/);
});

test("update_jira_work_note_section preserves other description sections and replaces one stage block", () => {
  const rootDir = makeTempDir("aceph-jira-note-root-");
  const descriptionPath = path.join(rootDir, "description.md");
  const blockPath = path.join(rootDir, "block.md");

  write(
    descriptionPath,
    [
      "# 제목",
      "",
      "### 프로젝트",
      "- repo: ceph-service-api",
      "",
      "### 작업 노트",
      "",
      "- 티켓 시작 시간: 2026-04-24 10:00:00 KST",
      "- 티켓 종료 시간:",
      "",
      "#### 문제 확인",
      "",
      "- 티켓: CDS-1",
      "",
      "#### 계획",
      "",
      "- 이전 요약",
      "",
      "### 문제점",
      "- 기존 문제",
      "",
    ].join("\n")
  );
  write(
    blockPath,
    [
      "#### 계획",
      "",
      "- 티켓: CDS-2135",
      "- 다음 액션: 수행 진행",
      "",
    ].join("\n")
  );
  write(
    path.join(rootDir, ".auto-ceph-work", "scripts", "update_jira_work_note_section.js"),
    fs.readFileSync(path.join(__dirname, "..", ".auto-ceph-work", "scripts", "update_jira_work_note_section.js"), "utf8")
  );

  const result = spawnSync(
    process.execPath,
    [path.join(rootDir, ".auto-ceph-work", "scripts", "update_jira_work_note_section.js"), descriptionPath, "계획", "summary", blockPath],
    { cwd: rootDir, encoding: "utf8" }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /### 프로젝트\n- repo: ceph-service-api/);
  assert.match(result.stdout, /### 문제점\n- 기존 문제/);
  assert.match(result.stdout, /- 티켓 시작 시간: 2026-04-24 10:00:00 KST/);
  assert.match(result.stdout, /- 티켓 종료 시간:/);
  assert.match(result.stdout, /#### 문제 확인[\s\S]*- 티켓: CDS-1/);
  assert.match(result.stdout, /#### 계획[\s\S]*- 티켓: CDS-2135[\s\S]*- 다음 액션: 수행 진행/);
  assert.doesNotMatch(result.stdout, /- 이전 요약/);
});

test("update_jira_work_note_section creates a work-note section when missing", () => {
  const rootDir = makeTempDir("aceph-jira-note-create-root-");
  const descriptionPath = path.join(rootDir, "description.md");
  const blockPath = path.join(rootDir, "block.md");

  write(
    descriptionPath,
    [
      "# 제목",
      "",
      "### 프로젝트",
      "- repo: ceph-service-api",
      "",
      "### 문제점",
      "- 기존 문제",
      "",
    ].join("\n")
  );
  write(
    blockPath,
    [
      "#### 문제 확인",
      "",
      "- 시작",
      "",
    ].join("\n")
  );
  write(
    path.join(rootDir, ".auto-ceph-work", "scripts", "update_jira_work_note_section.js"),
    fs.readFileSync(path.join(__dirname, "..", ".auto-ceph-work", "scripts", "update_jira_work_note_section.js"), "utf8")
  );

  const result = spawnSync(
    process.execPath,
    [path.join(rootDir, ".auto-ceph-work", "scripts", "update_jira_work_note_section.js"), descriptionPath, "문제 확인", "start", blockPath],
    { cwd: rootDir, encoding: "utf8" }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /### 문제점\n- 기존 문제[\s\S]*### 작업 노트[\s\S]*#### 문제 확인[\s\S]*- 시작/);
});

test("update_jira_ticket_time_note creates ticket time metadata before stage blocks", () => {
  const rootDir = makeTempDir("aceph-jira-time-create-root-");
  const descriptionPath = path.join(rootDir, "description.md");

  write(
    descriptionPath,
    [
      "# 제목",
      "",
      "### 작업 노트",
      "",
      "#### 문제 확인",
      "",
      "- 시작",
      "",
      "### 문제점",
      "- 기존 문제",
      "",
    ].join("\n")
  );

  const result = runNode(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "update_jira_ticket_time_note.js"),
    [descriptionPath, "start", "2026-04-24 10:15:03 KST"],
    rootDir
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /### 작업 노트\n\n- 티켓 시작 시간: 2026-04-24 10:15:03 KST\n- 티켓 종료 시간:\n\n#### 문제 확인/
  );
  assert.match(result.stdout, /### 문제점\n- 기존 문제/);
});

test("update_jira_ticket_time_note preserves start time and sets terminal end time", () => {
  const rootDir = makeTempDir("aceph-jira-time-end-root-");
  const descriptionPath = path.join(rootDir, "description.md");

  write(
    descriptionPath,
    [
      "# 제목",
      "",
      "### 작업 노트",
      "",
      "- 티켓 시작 시간: 2026-04-24 10:15:03 KST",
      "- 티켓 종료 시간:",
      "",
      "#### 리뷰 요청",
      "",
      "- 티켓: CDS-2135",
      "",
    ].join("\n")
  );

  const startResult = runNode(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "update_jira_ticket_time_note.js"),
    [descriptionPath, "start", "2026-04-24 11:00:00 KST"],
    rootDir
  );

  assert.equal(startResult.status, 0, startResult.stderr);
  assert.match(startResult.stdout, /- 티켓 시작 시간: 2026-04-24 10:15:03 KST/);
  assert.doesNotMatch(startResult.stdout, /- 티켓 시작 시간: 2026-04-24 11:00:00 KST/);

  write(descriptionPath, startResult.stdout);

  const endResult = runNode(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "update_jira_ticket_time_note.js"),
    [descriptionPath, "end", "2026-04-24 10:42:11 KST"],
    rootDir
  );

  assert.equal(endResult.status, 0, endResult.stderr);
  assert.match(endResult.stdout, /- 티켓 시작 시간: 2026-04-24 10:15:03 KST/);
  assert.match(endResult.stdout, /- 티켓 종료 시간: 2026-04-24 10:42:11 KST/);
  assert.match(endResult.stdout, /#### 리뷰 요청[\s\S]*- 티켓: CDS-2135/);
});

test("update_jira_work_note_section replaces a top-level loop-history section without touching work notes", () => {
  const rootDir = makeTempDir("aceph-jira-loop-history-root-");
  const descriptionPath = path.join(rootDir, "description.md");
  const blockPath = path.join(rootDir, "loop.md");

  write(
    descriptionPath,
    [
      "# 제목",
      "",
      "### 작업 노트",
      "",
      "#### 리뷰 요청",
      "",
      "- 기존 요약",
      "",
      "### 루프 히스토리",
      "",
      "old loop",
      "",
      "### 문제점",
      "",
      "- 기존 문제",
      "",
    ].join("\n")
  );
  write(
    blockPath,
    [
      "# CDS-2135 Loop History",
      "",
      "## 현재 루프 상태",
      "",
      "- 현재 iteration: 2",
      "",
    ].join("\n")
  );
  write(
    path.join(rootDir, ".auto-ceph-work", "scripts", "update_jira_work_note_section.js"),
    fs.readFileSync(path.join(__dirname, "..", ".auto-ceph-work", "scripts", "update_jira_work_note_section.js"), "utf8")
  );

  const result = spawnSync(
    process.execPath,
    [path.join(rootDir, ".auto-ceph-work", "scripts", "update_jira_work_note_section.js"), descriptionPath, "루프 히스토리", "section", blockPath],
    { cwd: rootDir, encoding: "utf8" }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /### 작업 노트[\s\S]*#### 리뷰 요청[\s\S]*- 기존 요약/);
  assert.match(result.stdout, /### 루프 히스토리[\s\S]*# CDS-2135 Loop History[\s\S]*- 현재 iteration: 2/);
  assert.doesNotMatch(result.stdout, /old loop/);
  assert.match(result.stdout, /### 문제점[\s\S]*- 기존 문제/);
});

test("update_jira_work_note_section places E2E sections before work notes", () => {
  const rootDir = makeTempDir("aceph-jira-e2e-section-root-");
  const descriptionPath = path.join(rootDir, "description.md");
  const blockPath = path.join(rootDir, "e2e.md");

  write(
    descriptionPath,
    [
      "# 제목",
      "",
      "### 개선 방향",
      "",
      "- 변경 방향",
      "",
      "### 작업 노트",
      "",
      "#### 리뷰 요청",
      "",
      "- 기존 요약",
      "",
    ].join("\n")
  );
  write(
    blockPath,
    [
      "#### 테스트 시나리오",
      "1. url로 접속한다.",
      "2. id/pw로 로그인한다.",
      "",
      "#### 기대 결과",
      "- 성공",
      "",
      "#### 확인 범위",
      "- 포함: 변경 기능",
      "",
    ].join("\n")
  );
  write(
    path.join(rootDir, ".auto-ceph-work", "scripts", "update_jira_work_note_section.js"),
    fs.readFileSync(path.join(__dirname, "..", ".auto-ceph-work", "scripts", "update_jira_work_note_section.js"), "utf8")
  );

  const result = spawnSync(
    process.execPath,
    [path.join(rootDir, ".auto-ceph-work", "scripts", "update_jira_work_note_section.js"), descriptionPath, "E2E 테스트 시나리오", "section", blockPath],
    { cwd: rootDir, encoding: "utf8" }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /### 개선 방향[\s\S]*- 변경 방향[\s\S]*### E2E 테스트 시나리오[\s\S]*#### 테스트 시나리오[\s\S]*### 작업 노트[\s\S]*#### 리뷰 요청/
  );
});

test("resolve_loop_state script reports iteration metadata and retry limit", () => {
  const rootDir = makeTempDir("aceph-loop-root-");
  write(
    ticketPath(rootDir, "CDS-2135", "08_LOOP.md"),
    `# CDS-2135 Loop History

## 메타 정보

- 단계: 루프 관리
- 상태: Done
- Jira 상태: N/A

## 현재 루프 상태

- 현재 iteration: 1
- 최대 iteration: 10
- 현재 loop 상태: in_progress
- 현재 stage: 검증
- 마지막 결과 상태: failed
- 마지막 loop 결정: fallback
- 마지막 fallback 단계: 수행
- 마지막 종료 사유: test failure

## Iteration History

### Iteration 1
- 시작 사유: initial run
- 최종 상태: in_progress
- 종료 stage: 검증

- stage: 문제 확인
  결과 상태: passed
  loop 결정: advance
  fallback 단계: 문제 확인
  감지 단계: 문제 검토
  종료 사유: none
  요약: intake complete

- stage: 문제 검토
  결과 상태: passed
  loop 결정: advance
  fallback 단계: 문제 확인
  감지 단계: 계획
  종료 사유: none
  요약: review complete

- stage: 계획
  결과 상태: passed
  loop 결정: advance
  fallback 단계: 문제 검토
  감지 단계: 수행
  종료 사유: none
  요약: plan complete
`
  );
  write(
    path.join(rootDir, ".auto-ceph-work", "scripts", "resolve_loop_state.sh"),
    fs.readFileSync(path.join(__dirname, "..", ".auto-ceph-work", "scripts", "resolve_loop_state.sh"), "utf8")
  );

  const result = runScript(
    path.join(rootDir, ".auto-ceph-work", "scripts", "resolve_loop_state.sh"),
    ["CDS-2135"],
    rootDir
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^current_iteration='1'$/m);
  assert.match(result.stdout, /^next_iteration='2'$/m);
  assert.match(result.stdout, /^run_iteration='1'$/m);
  assert.match(result.stdout, /^current_loop_status='in_progress'$/m);
  assert.match(result.stdout, /^current_stage='검증'$/m);
  assert.match(result.stdout, /^last_status='failed'$/m);
  assert.match(result.stdout, /^last_loop_decision='fallback'$/m);
  assert.match(result.stdout, /^last_fallback_stage='수행'$/m);
  assert.match(result.stdout, /^last_terminal_reason='test failure'$/m);
  assert.match(result.stdout, /^can_retry='yes'$/m);
});

test("resolve_loop_state script blocks automatic retry after the limit", () => {
  const rootDir = makeTempDir("aceph-loop-limit-root-");
  write(
    ticketPath(rootDir, "CDS-2135", "08_LOOP.md"),
    `# CDS-2135 Loop History

## 현재 루프 상태

- 현재 iteration: 10
- 최대 iteration: 10
- 현재 loop 상태: blocked
- 현재 stage: 검증
- 마지막 결과 상태: blocked
- 마지막 loop 결정: retry
- 마지막 fallback 단계: 수행
- 마지막 종료 사유: retry limit

## Iteration History

### Iteration 1
- 최종 상태: failed

### Iteration 2
- 최종 상태: failed

### Iteration 10
- 최종 상태: blocked
`
  );
  write(
    path.join(rootDir, ".auto-ceph-work", "scripts", "resolve_loop_state.sh"),
    fs.readFileSync(path.join(__dirname, "..", ".auto-ceph-work", "scripts", "resolve_loop_state.sh"), "utf8")
  );

  const result = runScript(
    path.join(rootDir, ".auto-ceph-work", "scripts", "resolve_loop_state.sh"),
    ["CDS-2135"],
    rootDir
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^current_iteration='10'$/m);
  assert.match(result.stdout, /^next_iteration='11'$/m);
  assert.match(result.stdout, /^run_iteration='10'$/m);
  assert.match(result.stdout, /^can_retry='no'$/m);
});

test("resolve_loop_state script blocks automatic retry for non-retryable terminal reasons", () => {
  const rootDir = makeTempDir("aceph-loop-non-retryable-root-");
  write(
    ticketPath(rootDir, "CDS-2135", "08_LOOP.md"),
    `# CDS-2135 Loop History

## 현재 루프 상태

- 현재 iteration: 1
- 최대 iteration: 10
- 현재 loop 상태: blocked
- 현재 stage: 문제 확인
- 마지막 결과 상태: blocked
- 마지막 loop 결정: stop
- 마지막 fallback 단계: 문제 확인
- 마지막 종료 사유: repo_mismatch

## Iteration History

### Iteration 1
- 최종 상태: blocked
`
  );
  write(
    path.join(rootDir, ".auto-ceph-work", "scripts", "resolve_loop_state.sh"),
    fs.readFileSync(path.join(__dirname, "..", ".auto-ceph-work", "scripts", "resolve_loop_state.sh"), "utf8")
  );

  const result = runScript(
    path.join(rootDir, ".auto-ceph-work", "scripts", "resolve_loop_state.sh"),
    ["CDS-2135"],
    rootDir
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^current_iteration='1'$/m);
  assert.match(result.stdout, /^next_iteration='2'$/m);
  assert.match(result.stdout, /^run_iteration='1'$/m);
  assert.match(result.stdout, /^last_terminal_reason='repo_mismatch'$/m);
  assert.match(result.stdout, /^can_retry='no'$/m);
});

test("resolve_loop_state script blocks automatic retry for branch and post-ticket failures", () => {
  const reasons = ["ticket_branch_not_prepared", "post_ticket_branch_mismatch"];

  for (const reason of reasons) {
    const rootDir = makeTempDir(`aceph-loop-${reason}-root-`);
    write(
      ticketPath(rootDir, "CDS-2135", "08_LOOP.md"),
      `# CDS-2135 Loop History

## 현재 루프 상태

- 현재 iteration: 2
- 최대 iteration: 10
- 현재 loop 상태: blocked
- 현재 stage: 수행
- 마지막 결과 상태: blocked
- 마지막 loop 결정: stop
- 마지막 fallback 단계: 수행
- 마지막 종료 사유: ${reason}

## Iteration History

### Iteration 1
- 최종 상태: failed

### Iteration 2
- 최종 상태: blocked
`
    );
    write(
      path.join(rootDir, ".auto-ceph-work", "scripts", "resolve_loop_state.sh"),
      fs.readFileSync(path.join(__dirname, "..", ".auto-ceph-work", "scripts", "resolve_loop_state.sh"), "utf8")
    );

    const result = runScript(
      path.join(rootDir, ".auto-ceph-work", "scripts", "resolve_loop_state.sh"),
      ["CDS-2135"],
      rootDir
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, new RegExp(`^last_terminal_reason='${reason}'$`, "m"));
    assert.match(result.stdout, /^can_retry='no'$/m);
  }
});

test("build_stage_prompt includes current project repo for intake matching", () => {
  const rootDir = makeTempDir("ceph-service-api-");
  write(
    ticketPath(rootDir, "CDS-2135", "01_TICKET.md"),
    "# TICKET\n\n- repo: ceph-service-api\n- remote: origin\n"
  );
  write(ticketPath(rootDir, "CDS-2135", "02_CONTEXT.md"), "# CONTEXT\n");
  write(ticketPath(rootDir, "CDS-2135", "03_PLAN.md"), "# PLAN\n- 목표: test\n- 성공 기준: 200\n기준 브랜치: dev\n");
  write(ticketPath(rootDir, "CDS-2135", "04_EXECUTION.md"), "# EXECUTION\n- 수행 내용: test\n");
  write(ticketPath(rootDir, "CDS-2135", "05_UAT.md"), "# UAT\n- 최종 판단: pending\n");
  write(ticketPath(rootDir, "CDS-2135", "06_REVIEW.md"), "# REVIEW\n- 결과: approved\n");
  write(ticketPath(rootDir, "CDS-2135", "07_SUMMARY.md"), "# SUMMARY\n- 주요 변경 1: test\n");
  write(ticketPath(rootDir, "CDS-2135", "08_LOOP.md"), "# LOOP\n## 현재 루프 상태\n- 현재 iteration: 0\n- 최대 iteration: 10\n- 현재 loop 상태: idle\n- 현재 stage: 문제 확인\n- 마지막 결과 상태:\n- 마지막 loop 결정:\n- 마지막 fallback 단계:\n- 마지막 종료 사유:\n\n## Iteration History\n");
  for (const scriptName of ["resolve_ticket_context.sh", "resolve_loop_state.sh", "build_stage_prompt.sh"]) {
    write(
      path.join(rootDir, ".auto-ceph-work", "scripts", scriptName),
      fs.readFileSync(path.join(__dirname, "..", ".auto-ceph-work", "scripts", scriptName), "utf8")
    );
  }

  const result = runScript(
    path.join(rootDir, ".auto-ceph-work", "scripts", "build_stage_prompt.sh"),
    ["문제 확인", "CDS-2135"],
    rootDir
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /- project_repo: ceph-service-api-[^\n]+/);
  assert.match(result.stdout, /For intake, treat `\[ACW\]` in the Jira title and `repo == ceph-service-api-[^`]+` as the intake gate\./);
  assert.match(result.stdout, /Treat `retry_pending` as a non-terminal intermediate state\./);
  assert.match(result.stdout, /agent_binding: aceph-ticket-intake/);
  assert.match(result.stdout, /retry_reason: none/);
  assert.match(result.stdout, /jira_stage_note_started: yes/);
  assert.match(result.stdout, /jira_stage_summary_written: yes/);
  assert.match(result.stdout, /jira_status_transition_applied: IN PROGRESS/);
  assert.match(result.stdout, /loop_decision: advance/);
  assert.match(result.stdout, /terminal_reason: none/);
  assert.match(result.stdout, /Do not rely on parent-thread chat context/);
});

test("build_stage_prompt includes required result fields for a non-transition stage", () => {
  const rootDir = makeTempDir("ceph-service-api-review-");
  write(
    ticketPath(rootDir, "CDS-3000", "01_TICKET.md"),
    "# TICKET\n\n- repo: ceph-service-api\n- remote: origin\n"
  );
  write(ticketPath(rootDir, "CDS-3000", "02_CONTEXT.md"), "# CONTEXT\n");
  write(ticketPath(rootDir, "CDS-3000", "03_PLAN.md"), "# PLAN\n- 목표: test\n- 성공 기준: ok\n기준 브랜치: dev\n");
  write(ticketPath(rootDir, "CDS-3000", "04_EXECUTION.md"), "# EXECUTION\n- 수행 내용: test\n");
  write(ticketPath(rootDir, "CDS-3000", "05_UAT.md"), "# UAT\n- 최종 판단: pass\n");
  write(ticketPath(rootDir, "CDS-3000", "06_REVIEW.md"), "# REVIEW\n- 결과: pending\n");
  write(ticketPath(rootDir, "CDS-3000", "07_SUMMARY.md"), "# SUMMARY\n");
  write(ticketPath(rootDir, "CDS-3000", "08_LOOP.md"), "# LOOP\n## 현재 루프 상태\n- 현재 iteration: 1\n- 최대 iteration: 10\n- 현재 loop 상태: in_progress\n- 현재 stage: 코드 리뷰\n- 마지막 결과 상태: passed\n- 마지막 loop 결정: advance\n- 마지막 fallback 단계: 수행\n- 마지막 종료 사유: none\n\n## Iteration History\n");
  for (const scriptName of ["resolve_ticket_context.sh", "resolve_loop_state.sh", "build_stage_prompt.sh"]) {
    write(
      path.join(rootDir, ".auto-ceph-work", "scripts", scriptName),
      fs.readFileSync(path.join(__dirname, "..", ".auto-ceph-work", "scripts", scriptName), "utf8")
    );
  }

  const result = runScript(
    path.join(rootDir, ".auto-ceph-work", "scripts", "build_stage_prompt.sh"),
    ["코드 리뷰", "CDS-3000"],
    rootDir
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /agent_binding: aceph-ticket-code-review/);
  assert.match(result.stdout, /retry_reason: none/);
  assert.match(result.stdout, /jira_stage_note_started: yes/);
  assert.match(result.stdout, /jira_stage_summary_written: yes/);
  assert.match(result.stdout, /jira_status_transition_applied: IN PROGRESS/);
  assert.match(result.stdout, /fallback_stage: 수행/);
  assert.match(result.stdout, /terminal_reason: none/);
});

test("auto-ceph contracts treat wait timeouts as non-terminal polling while a subagent is pending", () => {
  const skill = fs.readFileSync(
    path.join(__dirname, "..", ".codex", "skills", "auto-ceph", "SKILL.md"),
    "utf8"
  );
  const nextCommand = fs.readFileSync(
    path.join(__dirname, "..", ".codex", "commands", "aceph", "next.md"),
    "utf8"
  );
  const orchestration = fs.readFileSync(
    path.join(__dirname, "..", ".auto-ceph-work", "workflows", "orchestrate-ticket.md"),
    "utf8"
  );
  const runtimeOrchestration = fs.readFileSync(
    path.join(__dirname, "..", ".auto-ceph-work", "references", "runtime-orchestration.md"),
    "utf8"
  );

  assert.match(skill, /spawn 이후 `wait_agent` timeout은 단순 polling 결과다/);
  assert.match(skill, /pending stage agent가 하나라도 남아 있으면 메인 세션은 `final_answer`로 종료하면 안 된다/);
  assert.ok(nextCommand.includes("Treat `wait_agent` timeout or an empty `statuses={}` result as a non-terminal polling outcome only."));
  assert.ok(nextCommand.includes("keep waiting or re-waiting on that same agent id until it reaches a terminal subagent status"));
  assert.match(orchestration, /If `wait_agent` times out or returns an empty status set, treat that as a non-terminal polling result and continue waiting on the same agent id\./);
  assert.match(orchestration, /Never emit a terminal answer while any spawned stage agent is still pending or running\./);
  assert.match(runtimeOrchestration, /`wait_agent` timeout 또는 빈 status는 agent 중단이 아니라 polling 결과로만 본다/);
  assert.match(runtimeOrchestration, /pending\/running stage agent가 남아 있으면 메인 세션은 종료할 수 없고, 같은 agent id를 계속 기다려야 한다/);
});

test("runtime-orchestration stage result example matches the required complete field set", () => {
  const runtimeOrchestration = fs.readFileSync(
    path.join(__dirname, "..", ".auto-ceph-work", "references", "runtime-orchestration.md"),
    "utf8"
  );

  assert.match(runtimeOrchestration, /agent_binding: aceph-ticket-plan/);
  assert.match(runtimeOrchestration, /retry_reason: none/);
  assert.match(runtimeOrchestration, /jira_stage_note_started: yes/);
  assert.match(runtimeOrchestration, /jira_stage_summary_written: yes/);
  assert.match(runtimeOrchestration, /jira_status_transition_applied: IN PROGRESS/);
  assert.match(runtimeOrchestration, /jira_updates_applied: description_work_note_start=계획, description_work_note_summary=03_PLAN\.md 발췌 반영/);
  assert.match(runtimeOrchestration, /iteration: 1/);
  assert.match(runtimeOrchestration, /loop_decision: advance/);
  assert.match(runtimeOrchestration, /detected_stage_after_run: 수행/);
  assert.match(runtimeOrchestration, /terminal_reason: none/);
});

test("build_stage_prompt example uses field-complete jira_updates_applied wording", () => {
  const promptBuilder = fs.readFileSync(
    path.join(__dirname, "..", ".auto-ceph-work", "scripts", "build_stage_prompt.sh"),
    "utf8"
  );

  assert.match(promptBuilder, /jira_stage_note_started: yes/);
  assert.match(promptBuilder, /jira_stage_summary_written: yes/);
  assert.match(promptBuilder, /jira_status_transition_applied: \$stage_result_transition/);
  assert.match(promptBuilder, /jira_updates_applied: description_work_note_start=\$stage_note, description_work_note_summary=\$stage_artifact excerpt synced/);
  assert.match(promptBuilder, /description_merge_request=07_SUMMARY\.md excerpt synced/);
  assert.match(promptBuilder, /retry_reason: none/);
  assert.doesNotMatch(promptBuilder, /jira_updates_applied: note=/);
});

test("stage workflows require required-field-complete stage results", () => {
  const workflowFiles = [
    "intake-ticket.md",
    "review-ticket.md",
    "plan-ticket.md",
    "execute-ticket.md",
    "verify-ticket.md",
    "code-review-ticket.md",
    "review-request-ticket.md",
  ];

  for (const fileName of workflowFiles) {
    const contents = fs.readFileSync(
      path.join(__dirname, "..", ".auto-ceph-work", "workflows", fileName),
      "utf8"
    );
    assert.match(contents, /Return a final `<stage_result>` block with all required fields from `stage-result-format\.md`\./);
    assert.doesNotMatch(contents, /- Return `<stage_result>`\./);
  }
});

test("auto-ceph contracts define verification-unblock retry as minimal inner-loop scope", () => {
  const skill = fs.readFileSync(
    path.join(__dirname, "..", ".codex", "skills", "auto-ceph", "SKILL.md"),
    "utf8"
  );
  const executeCommand = fs.readFileSync(
    path.join(__dirname, "..", ".codex", "commands", "aceph", "execute-ticket.md"),
    "utf8"
  );
  const verifyCommand = fs.readFileSync(
    path.join(__dirname, "..", ".codex", "commands", "aceph", "verify-ticket.md"),
    "utf8"
  );
  const orchestration = fs.readFileSync(
    path.join(__dirname, "..", ".auto-ceph-work", "workflows", "orchestrate-ticket.md"),
    "utf8"
  );
  const runtimeContract = fs.readFileSync(
    path.join(__dirname, "..", ".auto-ceph-work", "references", "runtime-contract.md"),
    "utf8"
  );
  const stageResult = fs.readFileSync(
    path.join(__dirname, "..", ".auto-ceph-work", "references", "stage-result-format.md"),
    "utf8"
  );

  assert.match(skill, /`retry_reason: verification_unblock`/);
  assert.match(skill, /현재 티켓 검증을 직접 막는 최소 컴파일\/테스트 unblock 수정만 허용/);
  assert.match(executeCommand, /retry for `retry_reason: verification_unblock`/);
  assert.match(verifyCommand, /return `needs_retry` with `retry_reason: verification_unblock`/);
  assert.match(orchestration, /rebuild the `수행` stage prompt with the concrete blocking compile\/test errors/);
  assert.match(orchestration, /do not ask the user whether to stop, widen scope, or continue/);
  assert.match(runtimeContract, /unrelated `compileTestJava`/);
  assert.match(stageResult, /retry_reason/);
  assert.match(stageResult, /verification_unblock/);
});

test("auto-ceph contracts no longer treat needs_retry as a terminal git status", () => {
  const readme = fs.readFileSync(path.join(__dirname, "..", "README.md"), "utf8");
  const skill = fs.readFileSync(
    path.join(__dirname, "..", ".codex", "skills", "auto-ceph", "SKILL.md"),
    "utf8"
  );
  const runtimeOrchestration = fs.readFileSync(
    path.join(__dirname, "..", ".auto-ceph-work", "references", "runtime-orchestration.md"),
    "utf8"
  );
  const runtimeContract = fs.readFileSync(
    path.join(__dirname, "..", ".auto-ceph-work", "references", "runtime-contract.md"),
    "utf8"
  );

  assert.doesNotMatch(readme, /`needs_retry`: `chore\(auto-ceph\): stop <TICKET-ID>`/);
  assert.doesNotMatch(skill, /`needs_retry`는 `chore\(auto-ceph\): stop <TICKET-ID>`/);
  assert.doesNotMatch(runtimeOrchestration, /`needs_retry`: `chore\(auto-ceph\): stop <TICKET-ID>`/);
  assert.match(runtimeOrchestration, /`needs_retry` 자체로는 review-request stage git 후처리를 열지 않는다/);
  assert.match(runtimeContract, /`needs_retry`는 terminal 상태가 아니므로 그 자체로는 stage 내부 commit\/push 대상이 아니다/);
});

test("jira status contracts pin each stage to an explicit target state", () => {
  const jiraSync = readRepoFile(path.join(".auto-ceph-work", "references", "jira-sync.md"));
  const runtimeContract = readRepoFile(path.join(".auto-ceph-work", "references", "runtime-contract.md"));
  const skill = readRepoFile(path.join(".codex", "skills", "auto-ceph", "SKILL.md"));
  const codeReviewCommand = readRepoFile(path.join(".codex", "commands", "aceph", "code-review-ticket.md"));
  const reviewRequestCommand = readRepoFile(path.join(".codex", "commands", "aceph", "review-request-ticket.md"));

  assert.match(jiraSync, /문제 검토: `IN PROGRESS`/);
  assert.match(jiraSync, /계획: `IN PROGRESS`/);
  assert.match(jiraSync, /검증: `IN PROGRESS`/);
  assert.match(jiraSync, /코드 리뷰: `IN PROGRESS`/);
  assert.match(jiraSync, /리뷰 요청: `RESOLVE`/);
  assert.match(runtimeContract, /검증 -> IN PROGRESS/);
  assert.match(runtimeContract, /코드 리뷰 -> IN PROGRESS/);
  assert.match(runtimeContract, /리뷰 요청 -> RESOLVE/);
  assert.match(skill, /`문제 확인`\/`문제 검토`\/`계획`\/`수행`\/`검증`\/`코드 리뷰`는 작업 진행 중 상태인 `IN PROGRESS`, `리뷰 요청`은 최종 종료 상태인 `RESOLVE`/);
  assert.match(codeReviewCommand, /Jira target state: `IN PROGRESS`/);
  assert.match(reviewRequestCommand, /Jira target state: `RESOLVE`/);
  assert.match(reviewRequestCommand, /### 루프 히스토리/);
});

test("jira sync contracts require stage excerpts and review-request loop-history sync", () => {
  const jiraSync = readRepoFile(path.join(".auto-ceph-work", "references", "jira-sync.md"));
  const runtimeContract = readRepoFile(path.join(".auto-ceph-work", "references", "runtime-contract.md"));
  const skill = readRepoFile(path.join(".codex", "skills", "auto-ceph", "SKILL.md"));
  const workflow = readRepoFile(path.join(".auto-ceph-work", "workflows", "review-request-ticket.md"));

  assert.match(jiraSync, /산출물의 고정 섹션을 발췌/);
  assert.match(jiraSync, /Merge Request 핵심 메타/);
  assert.match(jiraSync, /### 루프 히스토리/);
  assert.match(runtimeContract, /작업 노트.*stage 산출물의 고정 섹션 발췌/);
  assert.match(runtimeContract, /canonical helper 기반 MR 생성 또는 재사용/);
  assert.match(runtimeContract, /Jira description 최종 동기화/);
  assert.match(runtimeContract, /08_LOOP\.md.*루프 히스토리.*섹션 반영/);
  assert.match(skill, /`08_LOOP\.md` 전문을 Jira description top-level `### 루프 히스토리` 섹션에 동기화/);
  assert.match(workflow, /Final-sync Jira description/);
});

test("auto-ceph contracts record ticket-level start and end times in work notes", () => {
  const nextCommand = readRepoFile(path.join(".codex", "commands", "aceph", "next.md"));
  const orchestration = readRepoFile(path.join(".auto-ceph-work", "workflows", "orchestrate-ticket.md"));
  const runtimeContract = readRepoFile(path.join(".auto-ceph-work", "references", "runtime-contract.md"));
  const runtimeOrchestration = readRepoFile(path.join(".auto-ceph-work", "references", "runtime-orchestration.md"));
  const jiraSync = readRepoFile(path.join(".auto-ceph-work", "references", "jira-sync.md"));
  const skill = readRepoFile(path.join(".codex", "skills", "auto-ceph", "SKILL.md"));
  const readme = readRepoFile("README.md");

  assert.match(nextCommand, /update_jira_ticket_time_note\.js <description-file> start/);
  assert.match(nextCommand, /update_jira_ticket_time_note\.js <description-file> end/);
  assert.match(orchestration, /티켓 시작 시간/);
  assert.match(orchestration, /티켓 종료 시간/);
  assert.match(runtimeContract, /ticket-level 시간 기록용 `\.auto-ceph-work\/scripts\/update_jira_ticket_time_note\.js`/);
  assert.match(runtimeOrchestration, /티켓 시작 시간/);
  assert.match(runtimeOrchestration, /티켓 종료 시간/);
  assert.match(jiraSync, /시간 메타는 `- 티켓 시작 시간: YYYY-MM-DD HH:mm:ss Z`와 `- 티켓 종료 시간:`/);
  assert.match(skill, /각 티켓 처리 시작 전에 메인 세션/);
  assert.match(skill, /티켓 terminal 후에는 메인 세션이 최신 Jira description을 읽고/);
  assert.match(readme, /ticket-level 시간 메타/);
});

test("review-request assets and contracts require glab merge request handling", () => {
  const template = readRepoFile(path.join(".auto-ceph-work", "templates", "07_SUMMARY.md"));
  const workflow = readRepoFile(path.join(".auto-ceph-work", "workflows", "review-request-ticket.md"));
  const command = readRepoFile(path.join(".codex", "commands", "aceph", "review-request-ticket.md"));
  const agent = readRepoFile(path.join(".codex", "agents", "aceph-ticket-review-request.toml"));
  const promptBuilder = readRepoFile(path.join(".auto-ceph-work", "scripts", "build_stage_prompt.sh"));
  const stageResult = readRepoFile(path.join(".auto-ceph-work", "references", "stage-result-format.md"));
  const helper = readRepoFile(path.join(".auto-ceph-work", "scripts", "create_or_reuse_merge_request.js"));

  assert.match(template, /## Merge Request/);
  assert.match(template, /- 상태:/);
  assert.match(template, /- 제목:/);
  assert.match(template, /- URL:/);
  assert.match(template, /- source:/);
  assert.match(template, /- target:/);
  assert.match(workflow, /Use the canonical helper `.auto-ceph-work\/scripts\/create_or_reuse_merge_request\.js`/);
  assert.match(command, /canonical helper `.auto-ceph-work\/scripts\/create_or_reuse_merge_request\.js`/);
  assert.match(agent, /Use `.auto-ceph-work\/scripts\/create_or_reuse_merge_request\.js` as the canonical merge-request path/);
  assert.match(promptBuilder, /create_or_reuse_merge_request\.js/);
  assert.match(workflow, /Commit the current ticket branch changes/);
  assert.match(workflow, /Final-sync Jira description/);
  assert.match(command, /This stage owns ticket-level commit and push before merge-request work/);
  assert.match(command, /final Jira description sync for both the stage summary note and top-level loop-history section/);
  assert.match(agent, /Own ticket-level git post-processing in this stage/);
  assert.match(helper, /mr",\s+"list"/);
  assert.match(helper, /mr",\s+"create"/);
  assert.match(stageResult, /commit\/push 여부, MR 생성 또는 재사용 결과, 핵심 URL/);
});

test("main orchestration delegates commit and push to review-request stage", () => {
  const nextCommand = readRepoFile(path.join(".codex", "commands", "aceph", "next.md"));
  const orchestration = readRepoFile(path.join(".auto-ceph-work", "workflows", "orchestrate-ticket.md"));
  const runtimeContract = readRepoFile(path.join(".auto-ceph-work", "references", "runtime-contract.md"));
  const runtimeOrchestration = readRepoFile(path.join(".auto-ceph-work", "references", "runtime-orchestration.md"));
  const skill = readRepoFile(path.join(".codex", "skills", "auto-ceph", "SKILL.md"));

  assert.match(nextCommand, /do not perform ticket-level commit or push in the main session/);
  assert.match(orchestration, /do not run ticket-level commit or push in the main session/);
  assert.match(runtimeContract, /메인 세션은 티켓 단위 `git commit`과 `git push`를 수행하지 않으며/);
  assert.match(runtimeOrchestration, /메인 세션은 티켓 loop terminal 시 commit\/push를 수행하지 않는다/);
  assert.match(skill, /ticket 단위 `git commit`과 `git push`는 `리뷰 요청` stage가 `\.auto-ceph-work\/scripts\/commit_and_push_ticket_branch\.sh`를 통해 수행한다/);
});

test("auto-ceph skill defines review-request completion as a helper-backed exception", () => {
  const skill = readRepoFile(path.join(".codex", "skills", "auto-ceph", "SKILL.md"));
  const detector = readRepoFile(path.join(".auto-ceph-work", "scripts", "detect_ticket_stage.sh"));
  const workflow = readRepoFile(path.join(".auto-ceph-work", "references", "workflow.md"));
  const runtimeContract = readRepoFile(path.join(".auto-ceph-work", "references", "runtime-contract.md"));
  const runtimeOrchestration = readRepoFile(path.join(".auto-ceph-work", "references", "runtime-orchestration.md"));
  const reviewRequestAgent = readRepoFile(path.join(".codex", "agents", "aceph-ticket-review-request.toml"));

  assert.match(skill, /일반 stage 완료 조건은 `Jira 시작 기록 -> 산출물 생성\/갱신 -> Jira 요약 기록`/);
  assert.match(skill, /`리뷰 요청` stage 완료 조건은 `Jira 시작 기록 -> 07_SUMMARY\.md 기본 요약 작성 -> ticket commit -> push -> MR helper 성공 -> 07_SUMMARY\.md MR 메타 반영 -> Jira description 최종 동기화`/);
  assert.match(workflow, /`07_SUMMARY\.md`가 미완료거나 MR 메타가 비어 있으면 `리뷰 요청`/);
  assert.match(runtimeContract, /`리뷰 요청` 단계는 Jira `RESOLVE` 보장, `07_SUMMARY\.md` 기본 요약 작성, ticket branch commit, push, canonical helper 기반 MR 생성 또는 재사용, helper 결과의 `07_SUMMARY\.md` 반영, Jira description 최종 동기화까지 끝나야 완료다/);
  assert.match(runtimeOrchestration, /`리뷰 요청` 완료의 상세 조건은 `runtime-contract\.md`와 `jira-sync\.md`의 review-request contract를 따른다/);
  assert.match(reviewRequestAgent, /description = "Finalize 07_SUMMARY\.md, commit\/push the ticket branch, and hand off the merge request\."/
  );
  assert.match(detector, /for required_key in "상태" "제목" "URL" "source" "target"/);
});

test("auto-ceph contracts canonicalize non-MR git work through helper scripts", () => {
  const reviewRequestCommand = readRepoFile(path.join(".codex", "commands", "aceph", "review-request-ticket.md"));
  const nextCommand = readRepoFile(path.join(".codex", "commands", "aceph", "next.md"));
  const reviewRequestWorkflow = readRepoFile(path.join(".auto-ceph-work", "workflows", "review-request-ticket.md"));
  const orchestration = readRepoFile(path.join(".auto-ceph-work", "workflows", "orchestrate-ticket.md"));
  const runtimeContract = readRepoFile(path.join(".auto-ceph-work", "references", "runtime-contract.md"));
  const workflow = readRepoFile(path.join(".auto-ceph-work", "references", "workflow.md"));
  const promptBuilder = readRepoFile(path.join(".auto-ceph-work", "scripts", "build_stage_prompt.sh"));
  const skill = readRepoFile(path.join(".codex", "skills", "auto-ceph", "SKILL.md"));

  assert.match(reviewRequestCommand, /`\.auto-ceph-work\/scripts\/commit_and_push_ticket_branch\.sh`/);
  assert.match(reviewRequestWorkflow, /Use the canonical helper `\.auto-ceph-work\/scripts\/commit_and_push_ticket_branch\.sh`/);
  assert.match(nextCommand, /`\.auto-ceph-work\/scripts\/return_to_dev_branch\.sh`/);
  assert.match(orchestration, /`\.auto-ceph-work\/scripts\/return_to_dev_branch\.sh`/);
  assert.match(runtimeContract, /`\.auto-ceph-work\/scripts\/return_to_dev_branch\.sh`/);
  assert.match(runtimeContract, /`\.auto-ceph-work\/scripts\/commit_and_push_ticket_branch\.sh`/);
  assert.match(workflow, /`\.auto-ceph-work\/scripts\/commit_and_push_ticket_branch\.sh` canonical helper/);
  assert.match(promptBuilder, /commit_and_push_ticket_branch\.sh/);
  assert.match(skill, /`\.auto-ceph-work\/scripts\/commit_and_push_ticket_branch\.sh` canonical helper만 사용한다/);
});

test("build_stage_prompt reflects stage-specific jira target states", () => {
  const rootDir = makeTempDir("aceph-prompt-status-root-");
  write(ticketPath(rootDir, "CDS-3000", "01_TICKET.md"), "# TICKET\n- repo: ceph-service-api\n- remote: origin\n");
  write(ticketPath(rootDir, "CDS-3000", "02_CONTEXT.md"), "# CONTEXT\n### 구현 대상\n\n- item\n\n### 검증 포인트\n\n- item\n");
  write(ticketPath(rootDir, "CDS-3000", "03_PLAN.md"), "# PLAN\n- 목표: test\n- 성공 기준: ok\n기준 브랜치: dev\n");
  write(ticketPath(rootDir, "CDS-3000", "04_EXECUTION.md"), "# EXECUTION\n- 수행 내용: done\n");
  write(ticketPath(rootDir, "CDS-3000", "05_UAT.md"), "# UAT\n- 최종 판단: ok\n");
  write(ticketPath(rootDir, "CDS-3000", "06_REVIEW.md"), "# REVIEW\n- 결과: pending\n");
  write(ticketPath(rootDir, "CDS-3000", "08_LOOP.md"), "# LOOP\n## 현재 루프 상태\n- 현재 iteration: 1\n- 최대 iteration: 10\n- 현재 loop 상태: in_progress\n- 현재 stage: 코드 리뷰\n- 마지막 결과 상태: passed\n- 마지막 loop 결정: advance\n- 마지막 fallback 단계: 수행\n- 마지막 종료 사유: none\n\n## Iteration History\n");
  write(path.join(rootDir, ".auto-ceph-work", "project.json"), JSON.stringify({
    version: 1,
    workflow: "auto-ceph-ticket-loop",
    docs_root: ".auto-ceph-work/tickets",
    ticket_root_pattern: ".auto-ceph-work/tickets/<TICKET-ID>",
  }, null, 2));
  for (const rel of [
    ".auto-ceph-work/scripts/build_stage_prompt.sh",
    ".auto-ceph-work/scripts/resolve_ticket_context.sh",
    ".auto-ceph-work/scripts/resolve_loop_state.sh",
  ]) {
    write(path.join(rootDir, rel), readRepoFile(rel));
  }

  let result = runScript(path.join(rootDir, ".auto-ceph-work", "scripts", "build_stage_prompt.sh"), ["코드 리뷰", "CDS-3000"], rootDir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Jira target state: IN PROGRESS/);
  assert.match(result.stdout, /jira_status_transition_applied: IN PROGRESS/);

  result = runScript(path.join(rootDir, ".auto-ceph-work", "scripts", "build_stage_prompt.sh"), ["리뷰 요청", "CDS-3000"], rootDir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Jira target state: RESOLVE/);
  assert.match(result.stdout, /jira_status_transition_applied: RESOLVE/);
  assert.match(result.stdout, /review-request-ticket\.md/);
  assert.match(result.stdout, /runtime-contract\.md/);
  assert.match(result.stdout, /runtime-orchestration\.md/);
  assert.match(result.stdout, /commit_and_push_ticket_branch\.sh/);
  assert.match(result.stdout, /create_or_reuse_merge_request\.js/);
  assert.match(result.stdout, /## Merge Request/);
  assert.match(result.stdout, /description_merge_request=07_SUMMARY\.md excerpt synced/);
  assert.match(result.stdout, /description_loop_history=08_LOOP\.md synced/);
  assert.match(result.stdout, /루프 히스토리/);
});

test("workflow guard warns when stage-specific jira status metadata drifts", () => {
  const rootDir = makeTempDir("aceph-hook-root-");
  write(path.join(rootDir, ".auto-ceph-work", "project.json"), JSON.stringify({
    version: 1,
    workflow: "auto-ceph-ticket-loop",
    docs_root: ".auto-ceph-work/tickets",
    ticket_root_pattern: ".auto-ceph-work/tickets/<TICKET-ID>",
  }, null, 2));
  for (const rel of [
    ".auto-ceph-work/hooks/aceph-workflow-guard.js",
    ".auto-ceph-work/hooks/lib/project-root.js",
    ".auto-ceph-work/scripts/detect_ticket_stage.sh",
  ]) {
    write(path.join(rootDir, rel), readRepoFile(rel));
  }
  write(ticketPath(rootDir, "CDS-3000", "01_TICKET.md"), "# TICKET\n- repo: aceph-hook-root-x\n- remote: origin\n");
  write(ticketPath(rootDir, "CDS-3000", "02_CONTEXT.md"), "# CONTEXT\n### 구현 대상\n\n- item\n\n### 검증 포인트\n\n- item\n");
  write(ticketPath(rootDir, "CDS-3000", "03_PLAN.md"), "# PLAN\n- 목표: ok\n- 성공 기준: ok\n기준 브랜치: dev\n");
  write(ticketPath(rootDir, "CDS-3000", "04_EXECUTION.md"), "# EXECUTION\n\n## 메타 정보\n\n- 단계: 수행\n- 상태: Waiting\n- Jira 상태: IN PROGRESS\n\n- 수행 내용: done\n");
  write(ticketPath(rootDir, "CDS-3000", "05_UAT.md"), "# UAT\n\n## 메타 정보\n\n- 단계: 검증\n- 상태: Waiting\n- Jira 상태: RESOLVE\n\n- 최종 판단: ok\n");

  const payload = {
    tool_name: "Edit",
    cwd: rootDir,
    tool_input: {
      file_path: ticketPath(rootDir, "CDS-3000", "05_UAT.md"),
      new_string: "- 결과: updated",
    },
  };
  const result = spawnSync("node", [path.join(rootDir, ".auto-ceph-work", "hooks", "aceph-workflow-guard.js")], {
    cwd: rootDir,
    input: JSON.stringify(payload),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /expects Jira status IN PROGRESS, but 05_UAT\.md declares RESOLVE/);
});

test("review and plan templates include verification-unblock scope guardrails", () => {
  const contextTemplate = fs.readFileSync(
    path.join(__dirname, "..", ".auto-ceph-work", "templates", "02_CONTEXT.md"),
    "utf8"
  );
  const planTemplate = fs.readFileSync(
    path.join(__dirname, "..", ".auto-ceph-work", "templates", "03_PLAN.md"),
    "utf8"
  );
  const executionTemplate = fs.readFileSync(
    path.join(__dirname, "..", ".auto-ceph-work", "templates", "04_EXECUTION.md"),
    "utf8"
  );

  assert.match(contextTemplate, /검증 Unblock 예외/);
  assert.match(contextTemplate, /최소 컴파일\/테스트 unblock 수정만 예외적으로 허용/);
  assert.match(planTemplate, /검증 Unblock 정책/);
  assert.match(planTemplate, /unrelated `compileTestJava`/);
  assert.match(executionTemplate, /verification-unblock 수정/);
  assert.match(executionTemplate, /unblock 대상 오류/);
});

test("stage agents pin role-specific model and reasoning defaults", () => {
  const expectedAgents = {
    "aceph-ticket-intake.toml": { model: "gpt-5.5", reasoning: "medium" },
    "aceph-ticket-plan.toml": { model: "gpt-5.5", reasoning: "high" },
    "aceph-ticket-review.toml": { model: "gpt-5.5", reasoning: "low" },
    "aceph-ticket-execute.toml": { model: "gpt-5.5", reasoning: "medium" },
    "aceph-ticket-verify.toml": { model: "gpt-5.5", reasoning: "medium" },
    "aceph-ticket-code-review.toml": { model: "gpt-5.5", reasoning: "high" },
    "aceph-ticket-review-request.toml": { model: "gpt-5.5", reasoning: "medium" },
    "aceph-approval-e2e.toml": { model: "gpt-5.5", reasoning: "medium" },
  };

  for (const [fileName, expected] of Object.entries(expectedAgents)) {
    const contents = readRepoFile(path.join(".codex", "agents", fileName));
    assert.match(contents, new RegExp(`model = "${expected.model.replace(/\./g, "\\.")}"`));
    assert.match(contents, new RegExp(`model_reasoning_effort = "${expected.reasoning}"`));
    assert.doesNotMatch(contents, /sandbox_mode = /);
  }
});

test("agent-facing docs explain pinned stage models without introducing sandbox overrides", () => {
  const readme = readRepoFile("README.md");
  const skill = readRepoFile(path.join(".codex", "skills", "auto-ceph", "SKILL.md"));

  assert.match(readme, /Skill Overview/);
  assert.match(readme, /\$auto-ceph-create[\s\S]*\$auto-ceph[\s\S]*\$auto-ceph-approval[\s\S]*\$auto-ceph-e2e/);
  assert.match(readme, /TO DO -> IN PROGRESS -> RESOLVE/);
  assert.match(readme, /RESOLVE -> REVIEW -> DONE/);
  assert.match(readme, /TO DO -> IN PROGRESS -> DONE/);
  assert.match(readme, /Generated Ticket Rules/);
  assert.match(readme, /모든 Jira `Task`는 backlog에 두지 않고 `CDS` scrum board의 active sprint에 즉시 배정/);
  assert.match(readme, /backlog fallback[\s\S]*허용하지 않음/);
  assert.match(readme, /Follow-Up Ticket Rules/);
  assert.match(readme, /remote-ceph-admin[\s\S]*ceph-service-api[\s\S]*ceph-api-gateway[\s\S]*ceph-service-scheduler/);
  assert.match(readme, /역할별 기본 `model`과 `model_reasoning_effort`가 고정/);
  assert.match(readme, /`sandbox_mode`는 명시하지 않아 상위 실행 환경 권한 정책을 그대로 따른다/);
  assert.match(skill, /역할별 기본 `model`과 `model_reasoning_effort`를 사용/);
  assert.match(skill, /`sandbox_mode`는 명시하지 않아 상위 실행 환경 정책을 상속한다/);
});

test("auto-ceph approval and e2e skills reference shared E2E and generated-ticket contracts", () => {
  const approvalSkill = readRepoFile(path.join(".codex", "skills", "auto-ceph-approval", "SKILL.md"));
  const e2eSkill = readRepoFile(path.join(".codex", "skills", "auto-ceph-e2e", "SKILL.md"));
  const e2eContract = readRepoFile(path.join(".auto-ceph-work", "references", "e2e-execution-contract.md"));
  const e2eCaseSelectionContract = readRepoFile(path.join(".auto-ceph-work", "references", "e2e-case-selection-contract.md"));
  const tromboneContract = readRepoFile(path.join(".auto-ceph-work", "references", "trombone-deployment-contract.md"));
  const mrApprovalContract = readRepoFile(path.join(".auto-ceph-work", "references", "mr-approval-contract.md"));
  const jiraCreateTemplate = readRepoFile(path.join(".auto-ceph-work", "references", "jira-create-template.md"));
  const ticketTemplate = readRepoFile(path.join(".auto-ceph-work", "references", "e2e-jira-ticket-template.md"));
  const e2eAgent = readRepoFile(path.join(".codex", "agents", "aceph-approval-e2e.toml"));
  const selectHelper = readRepoFile(path.join(".auto-ceph-work", "scripts", "select_e2e_cases.js"));
  const mrHelper = readRepoFile(path.join(".auto-ceph-work", "scripts", "approve_and_merge_review_mr.js"));
  const tromboneHelper = readRepoFile(path.join(".auto-ceph-work", "scripts", "run_trombone_pipeline.sh"));

  assert.match(approvalSkill, /\.auto-ceph-work\/references\/e2e-execution-contract\.md/);
  assert.match(approvalSkill, /\.auto-ceph-work\/references\/e2e-case-selection-contract\.md/);
  assert.match(approvalSkill, /\.auto-ceph-work\/references\/trombone-deployment-contract\.md/);
  assert.match(approvalSkill, /\.auto-ceph-work\/references\/mr-approval-contract\.md/);
  assert.doesNotMatch(approvalSkill, /11\. `\.auto-ceph-work\/scripts\/run_trombone_pipeline\.sh`/);
  assert.doesNotMatch(approvalSkill, /\d+\. `\.auto-ceph-work\/scripts\/approve_and_merge_review_mr\.js`/);
  assert.match(e2eSkill, /\.auto-ceph-work\/references\/e2e-execution-contract\.md/);
  assert.match(e2eSkill, /\.auto-ceph-work\/references\/e2e-case-selection-contract\.md/);
  assert.doesNotMatch(approvalSkill, /\d+\. `\.auto-ceph-work\/scripts\/select_e2e_cases\.js`/);
  assert.doesNotMatch(e2eSkill, /\d+\. `\.auto-ceph-work\/scripts\/select_e2e_cases\.js`/);
  assert.match(approvalSkill, /\[ACW\] <원본 티켓> E2E 실패 후속 조치/);
  assert.match(e2eSkill, /\[ACW\] <E2E 티켓 ID> E2E 실패 후속 조치 - <기능명>/);
  assert.match(approvalSkill, /e2e-execution-contract\.md`를 따른다/);
  assert.match(e2eSkill, /e2e-execution-contract\.md`를 따른다/);
  assert.match(approvalSkill, /jira-create-template\.md`를 따른다/);
  assert.match(e2eSkill, /jira-create-template\.md`를 따른다/);
  assert.doesNotMatch(approvalSkill, /remote-ceph-admin.*ceph-service-api.*ceph-api-gateway.*ceph-service-scheduler/);
  assert.doesNotMatch(e2eSkill, /remote-ceph-admin.*ceph-service-api.*ceph-api-gateway.*ceph-service-scheduler/);

  assert.match(e2eContract, /wait_agent` timeout 또는 빈 status는 실패가 아니라 polling 결과/);
  assert.match(e2eContract, /terminal result 전에는 Jira `### E2E 테스트 결과`, E2E 댓글, `DONE` 전이, 후속 티켓 생성을 수행하면 안 된다/);
  assert.match(e2eContract, /Playwright.*playwright_cli\.sh/);
  assert.match(e2eContract, /compact selected\/related cases/);
  assert.match(e2eContract, /원본 `\.auto-ceph-work\/references\/test-case\/v306\.json` 전체를 agent context에 넣지 않는다/);
  assert.match(e2eContract, /status=passed\|failed/);
  assert.match(e2eContract, /results\[\]/);
  assert.match(e2eContract, /orchestration\/system failure/);
  assert.match(e2eContract, /\$auto-ceph-approval[\s\S]*spawn -> terminal result wait -> result validation -> Jira 결과 처리 -> 다음 ticket spawn/);
  assert.match(e2eContract, /\$auto-ceph-e2e[\s\S]*menu-scoped E2E agent/);

  assert.match(e2eCaseSelectionContract, /select_e2e_cases\.js menu-list <target-case-json>/);
  assert.match(e2eCaseSelectionContract, /select_e2e_cases\.js select <target-case-json> <menu1>/);
  assert.match(e2eCaseSelectionContract, /features\[\]\.steps\[\]\.menu_path\[0\]/);
  assert.match(e2eCaseSelectionContract, /compact selected\/related cases/);
  assert.match(e2eCaseSelectionContract, /feature_name/);
  assert.match(e2eCaseSelectionContract, /procedure/);
  assert.match(e2eCaseSelectionContract, /expected_result/);
  assert.match(e2eCaseSelectionContract, /malformed JSON/);
  assert.match(e2eCaseSelectionContract, /관련 케이스 없음/);
  assert.match(e2eCaseSelectionContract, /v306\.json` 전체를 context에 넣으면 안 된다/);

  assert.match(tromboneContract, /run_trombone_pipeline\.sh <REPO> <CONFIG-FILE>/);
  assert.match(tromboneContract, /status=completed/);
  assert.match(tromboneContract, /pipeline=<pipeline_prefix><repo>/);
  assert.match(tromboneContract, /Trombone 배포 실패 \(<pipeline>\)/);
  assert.match(tromboneContract, /Helper\/runtime failure must not be labeled as a real Trombone deployment failure/);
  assert.match(tromboneContract, /Trombone 파이프라인 실행 완료 \(<pipeline>\)/);

  assert.match(mrApprovalContract, /approve_and_merge_review_mr\.js <TICKET-ID> <SOURCE> <TARGET>/);
  assert.match(mrApprovalContract, /glab` CLI만 사용/);
  assert.match(mrApprovalContract, /열린 MR/);
  assert.match(mrApprovalContract, /MR approve/);
  assert.match(mrApprovalContract, /merge 가능 상태/);
  assert.match(mrApprovalContract, /state=merged/);
  assert.match(mrApprovalContract, /target=dev/);
  assert.match(mrApprovalContract, /status=merged/);
  assert.match(mrApprovalContract, /non-zero exit/);

  assert.match(jiraCreateTemplate, /E2E Follow-Up Ticket Rules/);
  assert.match(jiraCreateTemplate, /\[ACW\] <원본 티켓> E2E 실패 후속 조치/);
  assert.match(jiraCreateTemplate, /\[ACW\] <E2E 티켓 ID> E2E 실패 후속 조치 - <기능명>/);
  assert.match(jiraCreateTemplate, /remote`는 항상 `origin`/);
  assert.match(jiraCreateTemplate, /remote-ceph-admin[\s\S]*ceph-service-api[\s\S]*ceph-api-gateway[\s\S]*ceph-service-scheduler/);
  assert.match(jiraCreateTemplate, /모든 Auto-Ceph 생성 티켓은 `jira_create_issue` 직후 `CDS` scrum board의 active sprint에 즉시 배정/);
  assert.match(jiraCreateTemplate, /jira_add_issues_to_sprint` 실패는 티켓 생성 실패/);
  assert.match(jiraCreateTemplate, /backlog fallback은 허용하지 않는다/);

  assert.match(approvalSkill, /`RESOLVE` 티켓/);
  assert.match(approvalSkill, /`RESOLVE -> REVIEW`/);
  assert.match(approvalSkill, /`transition_failed_excluded`/);
  assert.match(approvalSkill, /07_SUMMARY\.md/);
  assert.match(approvalSkill, /MR approve \/ merge success/);
  assert.match(approvalSkill, /mr-approval-contract\.md`를 따른다/);
  assert.match(approvalSkill, /trombone-deployment-contract\.md`를 따른다/);
  assert.match(approvalSkill, /`티켓`, `E2E 결과`, `DONE 전이`, `실패 원인`, `후속 티켓`/);

  assert.match(e2eSkill, /select_e2e_cases\.js menu-list <target-case-json>/);
  assert.match(e2eSkill, /select_e2e_cases\.js select <target-case-json> <menu1>/);
  assert.match(e2eSkill, /e2e-case-selection-contract\.md`를 따른다/);
  assert.match(e2eSkill, /\[ACW E2E\] <menu1> E2E 테스트/);
  assert.match(e2eSkill, /update_jira_ticket_time_note\.js <description-file> start/);
  assert.match(e2eSkill, /update_jira_ticket_time_note\.js <description-file> end/);
  assert.match(e2eSkill, /`기능`, `E2E 결과`, `실패 원인`, `후속 티켓`/);

  assert.match(ticketTemplate, /\[ACW E2E\] <menu1> E2E 테스트/);
  assert.match(ticketTemplate, /### E2E 테스트 정보/);
  assert.match(ticketTemplate, /### E2E 테스트 시나리오/);
  assert.match(ticketTemplate, /### E2E 테스트 결과/);
  assert.match(ticketTemplate, /티켓 시작 시간/);
  assert.match(ticketTemplate, /티켓 종료 시간/);

  assert.match(e2eAgent, /Auto-Ceph E2E agent/);
  assert.match(e2eAgent, /e2e-execution-contract\.md/);
  assert.doesNotMatch(e2eAgent, /\.codex\/skills\/auto-ceph-approval\/SKILL\.md/);
  assert.doesNotMatch(e2eAgent, /\.codex\/skills\/auto-ceph-e2e\/SKILL\.md/);
  assert.match(e2eAgent, /Use the mode-specific input supplied by the parent prompt/);
  assert.match(e2eAgent, /compact selected\/related test cases/);
  assert.match(e2eAgent, /Do not read or load the full `\.auto-ceph-work\/references\/test-case\/v306\.json`/);
  assert.match(e2eAgent, /The parent skill owns Jira description updates, comments, DONE transition, and follow-up ticket creation/);
  assert.match(selectHelper, /menu-list <target-case-json>/);
  assert.match(selectHelper, /select <target-case-json> <menu1>/);
  assert.match(mrHelper, /mr",\s+"approve"/);
  assert.match(mrHelper, /mr",\s+"merge"/);
  assert.match(tromboneHelper, /status=completed/);
});
