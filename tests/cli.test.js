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
  write(path.join(rootDir, ".auto-ceph-work", "scripts", "new-ticket-doc.sh"), "#!/usr/bin/env bash\n");
  write(path.join(rootDir, ".auto-ceph-work", "scripts", "prepare_ticket_branch.sh"), "#!/usr/bin/env bash\n");
  write(path.join(rootDir, ".auto-ceph-work", "hooks", "aceph-prompt-guard.js"), "console.log('prompt');\n");
  write(path.join(rootDir, ".auto-ceph-work", "hooks", "aceph-workflow-guard.js"), "console.log('workflow');\n");
  write(path.join(rootDir, ".auto-ceph-work", "hooks", "lib", "project-root.js"), "module.exports = {};\n");
  write(path.join(rootDir, ".auto-ceph-work", "README.md"), "# work\n");
  write(
    path.join(rootDir, ".codex", "agents", "aceph-ticket-intake.toml"),
    [
      'name = "aceph-ticket-intake"',
      'model = "gpt-5.4-mini"',
      'model_reasoning_effort = "medium"',
      "",
    ].join("\n")
  );
  write(path.join(rootDir, ".codex", "commands", "aceph", "next.md"), "---\nname: aceph:next\n---\n");
  write(path.join(rootDir, ".codex", "skills", "auto-ceph", "SKILL.md"), "# auto ceph\n");
  write(path.join(rootDir, ".codex", "skills", "auto-ceph-create", "SKILL.md"), "# auto ceph create\n");
}

function runCli(args) {
  return spawnSync(
    process.execPath,
    [path.join(__dirname, "..", "bin", "auto-ceph-work.js"), ...args],
    { encoding: "utf8" }
  );
}

function runScript(scriptPath, args, cwd) {
  return spawnSync("bash", [scriptPath, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function runShell(command, cwd) {
  return spawnSync("bash", ["-lc", command], {
    cwd,
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
  assert.ok(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "templates", "03_PLAN.md")));
  assert.equal(fs.existsSync(path.join(projectRoot, "doc", "_templates")), false);
  assert.equal(fs.existsSync(path.join(projectRoot, "scripts", "new-ticket-doc.sh")), false);
  assert.equal(fs.existsSync(path.join(projectRoot, ".auto-ceph-work.json")), false);

  const metadata = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".auto-ceph-work", "install.json"), "utf8")
  );
  assert.equal(metadata.version, packageVersion);
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
  assert.doesNotMatch(config, /aceph-stop-continue\.js/);
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
  assert.match(result.stdout, /jira_status_transition_applied: RESOLVE/);
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
  assert.match(runtimeOrchestration, /`needs_retry` 자체로는 terminal git 후처리를 열지 않는다/);
  assert.match(runtimeContract, /`needs_retry`는 terminal 상태가 아니므로 그 자체로는 티켓 단위 commit\/push 대상이 아니다/);
});

test("jira status contracts pin each stage to an explicit target state", () => {
  const jiraSync = readRepoFile(path.join(".auto-ceph-work", "references", "jira-sync.md"));
  const runtimeContract = readRepoFile(path.join(".auto-ceph-work", "references", "runtime-contract.md"));
  const skill = readRepoFile(path.join(".codex", "skills", "auto-ceph", "SKILL.md"));
  const codeReviewCommand = readRepoFile(path.join(".codex", "commands", "aceph", "code-review-ticket.md"));
  const reviewRequestCommand = readRepoFile(path.join(".codex", "commands", "aceph", "review-request-ticket.md"));

  assert.match(jiraSync, /문제 검토: `IN PROGRESS`/);
  assert.match(jiraSync, /계획: `IN PROGRESS`/);
  assert.match(jiraSync, /검증: `RESOLVE`/);
  assert.match(jiraSync, /코드 리뷰: `RESOLVE`/);
  assert.match(jiraSync, /리뷰 요청: `REVIEW`/);
  assert.match(runtimeContract, /검증 -> RESOLVE/);
  assert.match(runtimeContract, /코드 리뷰 -> RESOLVE/);
  assert.match(runtimeContract, /리뷰 요청 -> REVIEW/);
  assert.match(skill, /`검증`\/`코드 리뷰`는 `RESOLVE`, `리뷰 요청`은 `REVIEW`/);
  assert.match(codeReviewCommand, /Jira target state: `RESOLVE`/);
  assert.match(reviewRequestCommand, /Jira target state: `REVIEW`/);
  assert.match(reviewRequestCommand, /### 루프 히스토리/);
});

test("jira sync contracts require stage excerpts and review-request loop-history sync", () => {
  const jiraSync = readRepoFile(path.join(".auto-ceph-work", "references", "jira-sync.md"));
  const runtimeContract = readRepoFile(path.join(".auto-ceph-work", "references", "runtime-contract.md"));
  const skill = readRepoFile(path.join(".codex", "skills", "auto-ceph", "SKILL.md"));
  const workflow = readRepoFile(path.join(".auto-ceph-work", "workflows", "review-request-ticket.md"));

  assert.match(jiraSync, /산출물의 고정 섹션을 발췌/);
  assert.match(jiraSync, /### 루프 히스토리/);
  assert.match(runtimeContract, /작업 노트.*stage 산출물의 고정 섹션 발췌/);
  assert.match(runtimeContract, /08_LOOP\.md.*루프 히스토리.*동기화/);
  assert.match(skill, /`08_LOOP\.md` 전문을 Jira description top-level `### 루프 히스토리` 섹션에 동기화/);
  assert.match(workflow, /Sync Jira description `### 루프 히스토리` to the full contents of `08_LOOP\.md`/);
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
  assert.match(result.stdout, /Jira target state: RESOLVE/);
  assert.match(result.stdout, /jira_status_transition_applied: RESOLVE/);

  result = runScript(path.join(rootDir, ".auto-ceph-work", "scripts", "build_stage_prompt.sh"), ["리뷰 요청", "CDS-3000"], rootDir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Jira target state: REVIEW/);
  assert.match(result.stdout, /jira_status_transition_applied: REVIEW/);
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
  write(ticketPath(rootDir, "CDS-3000", "05_UAT.md"), "# UAT\n\n## 메타 정보\n\n- 단계: 검증\n- 상태: Waiting\n- Jira 상태: REVIEW\n\n- 최종 판단: ok\n");

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
  assert.match(result.stdout, /expects Jira status RESOLVE, but 05_UAT\.md declares REVIEW/);
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
    "aceph-ticket-intake.toml": { model: "gpt-5.4-mini", reasoning: "medium" },
    "aceph-ticket-plan.toml": { model: "gpt-5.4-mini", reasoning: "high" },
    "aceph-ticket-review.toml": { model: "gpt-5.4-mini", reasoning: "high" },
    "aceph-ticket-execute.toml": { model: "gpt-5.4", reasoning: "high" },
    "aceph-ticket-verify.toml": { model: "gpt-5.4", reasoning: "high" },
    "aceph-ticket-code-review.toml": { model: "gpt-5.4", reasoning: "high" },
    "aceph-ticket-review-request.toml": { model: "gpt-5.4-mini", reasoning: "low" },
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

  assert.match(readme, /역할별 기본 `model`과 `model_reasoning_effort`가 고정/);
  assert.match(readme, /`sandbox_mode`는 명시하지 않아 상위 실행 환경 권한 정책을 그대로 따른다/);
  assert.match(skill, /역할별 기본 `model`과 `model_reasoning_effort`를 사용/);
  assert.match(skill, /`sandbox_mode`는 명시하지 않아 상위 실행 환경 정책을 상속한다/);
});
