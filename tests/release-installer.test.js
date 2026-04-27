"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  INSTALL_META_FILE,
  MANAGED_BLOCK_END,
  MANAGED_BLOCK_START,
  cleanupEmptyParents,
  ensureCodexHooksFeature,
  getPackageVersion,
  installProject,
  parseArgs,
  uninstallProject,
  upsertManagedConfigBlock,
} = require("../scripts/release-installer.js");

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function makeSourceTree(rootDir) {
  write(path.join(rootDir, ".auto-ceph-work", "project.json"), JSON.stringify({
    version: 1,
    workflow: "auto-ceph-ticket-loop",
    docs_root: ".auto-ceph-work/tickets",
    ticket_root_pattern: ".auto-ceph-work/tickets/<TICKET-ID>",
  }, null, 2));
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

test("ensureCodexHooksFeature adds or upgrades the features block", () => {
  const created = ensureCodexHooksFeature('model = "gpt-5.4"\n');
  assert.match(created, /\[features\]/);
  assert.match(created, /codex_hooks = true/);

  const updated = ensureCodexHooksFeature('[features]\ncodex_hooks = false\n');
  assert.match(updated, /codex_hooks = true/);
  assert.doesNotMatch(updated, /codex_hooks = false/);
});

test("parseArgs uses package version as the default installer version", () => {
  const args = parseArgs(["install"]);
  assert.equal(args.version, getPackageVersion(path.join(__dirname, "..")));
});

test("upsertManagedConfigBlock replaces a previous managed block", () => {
  const first = upsertManagedConfigBlock("", "/tmp/project-a");
  const second = upsertManagedConfigBlock(first, "/tmp/project-b");

  assert.match(second, /codex_hooks = true/);
  assert.doesNotMatch(second, new RegExp(escapeForRegExp(MANAGED_BLOCK_START), "g"));
  assert.doesNotMatch(second, /\[\[hooks\]\]/);
  assert.doesNotMatch(second, /project-a|project-b/);
});

test("installProject copies assets and patches local .codex/config.toml", () => {
  const sourceRoot = makeTempDir("aceph-source-");
  const projectRoot = makeTempDir("aceph-project-");
  makeSourceTree(sourceRoot);

  installProject({
    sourceRoot,
    projectRoot,
    version: "v1.2.3",
  });

  assert.ok(fs.existsSync(path.join(projectRoot, ".codex", "hooks", "aceph-prompt-guard.js")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".codex", "hooks", "lib", "project-root.js")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".codex", "agents", "aceph-ticket-intake.toml")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".codex", "commands", "aceph", "next.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".codex", "skills", "auto-ceph", "SKILL.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".codex", "skills", "auto-ceph-create", "SKILL.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".codex", "skills", "auto-ceph-approval", "SKILL.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".codex", "skills", "auto-ceph-e2e", "SKILL.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, INSTALL_META_FILE)));
  assert.ok(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "project.json")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "templates", "03_PLAN.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "references", "e2e-test-config.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "references", "e2e-scenario-template.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "references", "e2e-execution-contract.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "references", "e2e-jira-ticket-template.md")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "references", "test-case", "v306.json")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "scripts", "create_or_reuse_merge_request.js")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "scripts", "approve_and_merge_review_mr.js")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "scripts", "commit_and_push_ticket_branch.sh")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "scripts", "return_to_dev_branch.sh")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "scripts", "update_jira_ticket_time_note.js")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "scripts", "select_e2e_cases.js")));
  assert.ok(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "scripts", "run_trombone_pipeline.sh")));
  assert.equal(fs.existsSync(path.join(projectRoot, "doc", "_templates")), false);
  assert.equal(fs.existsSync(path.join(projectRoot, "scripts", "new-ticket-doc.sh")), false);
  assert.equal(fs.existsSync(path.join(projectRoot, ".auto-ceph-work.json")), false);
  const intakeAgent = fs.readFileSync(path.join(projectRoot, ".codex", "agents", "aceph-ticket-intake.toml"), "utf8");
  assert.match(intakeAgent, /model = "gpt-5\.5"/);
  assert.match(intakeAgent, /model_reasoning_effort = "medium"/);

  const config = fs.readFileSync(path.join(projectRoot, ".codex", "config.toml"), "utf8");
  assert.match(config, /codex_hooks = true/);
  assert.doesNotMatch(config, /\[\[hooks\]\]/);
  assert.doesNotMatch(config, /\[\[hooks\.hooks\]\]/);
  assert.doesNotMatch(config, /event = "Stop"/);

  const hooksJson = JSON.parse(fs.readFileSync(path.join(projectRoot, ".codex", "hooks.json"), "utf8"));
  assert.equal(hooksJson.hooks.PreToolUse.length, 1);
  assert.equal(hooksJson.hooks.PreToolUse[0].matcher, "Write|Edit|MultiEdit|apply_patch|functions.apply_patch");
  const commands = hooksJson.hooks.PreToolUse[0].hooks.map((hook) => hook.command);
  assert.ok(commands.includes(`node "${path.join(projectRoot, ".codex", "hooks", "aceph-prompt-guard.js")}"`));
  assert.ok(commands.includes(`node "${path.join(projectRoot, ".codex", "hooks", "aceph-workflow-guard.js")}"`));
  assert.equal(commands.length, 2);
});

test("installProject removes legacy inline hook config and avoids duplicate hooks.json entries", () => {
  const sourceRoot = makeTempDir("aceph-source-");
  const projectRoot = makeTempDir("aceph-project-");
  makeSourceTree(sourceRoot);
  write(
    path.join(projectRoot, ".codex", "config.toml"),
    [
      "[features]",
      "codex_hooks = false",
      MANAGED_BLOCK_START,
      "[[hooks]]",
      'event = "PreToolUse"',
      MANAGED_BLOCK_END,
      "",
    ].join("\n")
  );

  installProject({
    sourceRoot,
    projectRoot,
    version: "v1.2.3",
  });
  installProject({
    sourceRoot,
    projectRoot,
    version: "v1.2.3",
  });

  const config = fs.readFileSync(path.join(projectRoot, ".codex", "config.toml"), "utf8");
  assert.match(config, /codex_hooks = true/);
  assert.doesNotMatch(config, new RegExp(escapeForRegExp(MANAGED_BLOCK_START)));
  assert.doesNotMatch(config, /\[\[hooks\]\]/);

  const hooksJson = JSON.parse(fs.readFileSync(path.join(projectRoot, ".codex", "hooks.json"), "utf8"));
  const commands = hooksJson.hooks.PreToolUse.flatMap((entry) => entry.hooks || []).map((hook) => hook.command);
  assert.equal(commands.filter((command) => /aceph-prompt-guard\.js/.test(command)).length, 1);
  assert.equal(commands.filter((command) => /aceph-workflow-guard\.js/.test(command)).length, 1);
});

test("installProject removes legacy aceph-orchestrator asset during refresh", () => {
  const sourceRoot = makeTempDir("aceph-source-");
  const projectRoot = makeTempDir("aceph-project-");
  makeSourceTree(sourceRoot);
  write(path.join(projectRoot, ".codex", "agents", "aceph-orchestrator.toml"), "legacy\n");

  installProject({
    sourceRoot,
    projectRoot,
    version: "v1.2.3",
  });

  assert.equal(fs.existsSync(path.join(projectRoot, ".codex", "agents", "aceph-orchestrator.toml")), false);
  assert.ok(fs.existsSync(path.join(projectRoot, ".codex", "agents", "aceph-ticket-intake.toml")));
});

test("uninstallProject removes managed assets and local config block only", () => {
  const sourceRoot = makeTempDir("aceph-source-");
  const projectRoot = makeTempDir("aceph-project-");
  makeSourceTree(sourceRoot);
  write(path.join(projectRoot, ".codex", "config.toml"), 'model = "gpt-5.4"\n');
  write(
    path.join(projectRoot, ".codex", "hooks.json"),
    JSON.stringify({
      hooks: {
        PreToolUse: [
          {
            matcher: "Bash",
            hooks: [
              {
                type: "command",
                command: "node \"/tmp/user-hook.js\"",
                timeout: 3,
              },
            ],
          },
        ],
      },
    }, null, 2)
  );

  installProject({
    sourceRoot,
    projectRoot,
    version: "v1.2.3",
  });

  uninstallProject({
    projectRoot,
  });

  assert.equal(fs.existsSync(path.join(projectRoot, ".auto-ceph-work")), false);
  assert.equal(fs.existsSync(path.join(projectRoot, ".auto-ceph-work", "references", "test-case", "v306.json")), false);
  assert.equal(fs.existsSync(path.join(projectRoot, "doc", "_templates")), false);
  assert.equal(fs.existsSync(path.join(projectRoot, ".codex", "agents")), false);
  assert.equal(fs.existsSync(path.join(projectRoot, ".codex", "commands")), false);
  assert.equal(fs.existsSync(path.join(projectRoot, ".codex", "skills")), false);
  assert.equal(fs.existsSync(path.join(projectRoot, ".codex", "hooks", "aceph-prompt-guard.js")), false);

  const config = fs.readFileSync(path.join(projectRoot, ".codex", "config.toml"), "utf8");
  assert.match(config, /model = "gpt-5.4"/);
  assert.doesNotMatch(config, /aceph-prompt-guard\.js/);
  assert.doesNotMatch(config, new RegExp(escapeForRegExp(MANAGED_BLOCK_START)));

  const hooksJson = JSON.parse(fs.readFileSync(path.join(projectRoot, ".codex", "hooks.json"), "utf8"));
  assert.equal(hooksJson.hooks.PreToolUse.length, 1);
  assert.equal(hooksJson.hooks.PreToolUse[0].matcher, "Bash");
  assert.equal(hooksJson.hooks.PreToolUse[0].hooks[0].command, "node \"/tmp/user-hook.js\"");
});

test("cleanupEmptyParents does not remove sibling paths outside the project root", () => {
  const parentRoot = makeTempDir("aceph-parent-");
  const projectRoot = path.join(parentRoot, "project");
  const siblingRoot = path.join(parentRoot, "project-other");
  const siblingChild = path.join(siblingRoot, "nested");
  fs.mkdirSync(path.join(projectRoot, ".codex"), { recursive: true });
  fs.mkdirSync(siblingChild, { recursive: true });

  cleanupEmptyParents(projectRoot, path.join(siblingChild, "removed.txt"));

  assert.equal(fs.existsSync(siblingChild), true);
  assert.equal(fs.existsSync(siblingRoot), true);
  assert.equal(fs.existsSync(projectRoot), true);
});

function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
