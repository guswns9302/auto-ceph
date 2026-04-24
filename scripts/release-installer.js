#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const CANONICAL_DIR = ".auto-ceph-work";
const INSTALL_META_FILE = path.join(CANONICAL_DIR, "install.json");
const PROJECT_CONFIG_FILE = path.join(CANONICAL_DIR, "project.json");
const MANAGED_BLOCK_START = "# >>> auto-ceph-work managed config >>>";
const MANAGED_BLOCK_END = "# <<< auto-ceph-work managed config <<<";
const FEATURE_OWNERSHIP_COMMENT = "# auto-ceph-work codex_hooks ownership";
const MUTATION_MATCHER = "Write|Edit|MultiEdit|apply_patch|functions.apply_patch";

const ROOT_FILES = [];

const ROOT_DIRS = [
  CANONICAL_DIR,
];

const LOCAL_CODEX_HOOK_FILES = [
  path.join(".codex", "hooks", "aceph-prompt-guard.js"),
  path.join(".codex", "hooks", "aceph-workflow-guard.js"),
  path.join(".codex", "hooks", "lib", "project-root.js"),
];

const LOCAL_CODEX_AGENT_DIR = path.join(".codex", "agents");
const LOCAL_CODEX_COMMANDS_DIR = path.join(".codex", "commands");
const LOCAL_CODEX_SKILL_DIR = path.join(".codex", "skills");

function getPackageVersion(sourceRoot) {
  const packageJsonPath = path.join(sourceRoot, "package.json");
  const raw = readFileIfExists(packageJsonPath);
  if (!raw) {
    return "dev";
  }

  try {
    const parsed = JSON.parse(raw);
    return typeof parsed.version === "string" && parsed.version.trim() ? parsed.version.trim() : "dev";
  } catch {
    return "dev";
  }
}

function usage(commandName = "auto-ceph-work") {
  return [
    "usage:",
    `  ${commandName} install [--project <path>] [--version <tag>] [--source <path>]`,
    `  ${commandName} update [--project <path>] [--version <tag>] [--source <path>]`,
    `  ${commandName} uninstall [--project <path>]`,
  ].join("\n");
}

function parseArgs(argv) {
  const sourceRoot = path.resolve(__dirname, "..");
  const args = {
    command: null,
    project: process.cwd(),
    source: sourceRoot,
    version: getPackageVersion(sourceRoot),
  };

  const values = [...argv];
  while (values.length > 0) {
    const token = values.shift();
    if (!args.command && !token.startsWith("--")) {
      args.command = token;
      continue;
    }

    if (token === "--project") {
      args.project = values.shift();
      continue;
    }

    if (token === "--source") {
      args.source = values.shift();
      continue;
    }

    if (token === "--version") {
      args.version = values.shift();
      continue;
    }

    throw new Error(`unknown argument: ${token}`);
  }

  if (!args.command) {
    throw new Error("missing command");
  }

  for (const key of ["project", "source", "version"]) {
    if (!args[key]) {
      throw new Error(`missing value for ${key}`);
    }
  }

  args.project = path.resolve(args.project);
  args.source = path.resolve(args.source);
  return args;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readFileIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

function copyFile(sourcePath, targetPath) {
  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

function replaceDirectory(sourceDir, targetDir) {
  fs.rmSync(targetDir, { recursive: true, force: true });
  ensureDir(path.dirname(targetDir));
  fs.cpSync(sourceDir, targetDir, { recursive: true });
}

function relativeManifestPath(relativePath) {
  return relativePath.replace(/\\/g, "/");
}

function buildManagedPaths() {
  const paths = [
    ...ROOT_FILES,
    ...ROOT_DIRS,
    LOCAL_CODEX_AGENT_DIR,
    LOCAL_CODEX_COMMANDS_DIR,
    LOCAL_CODEX_SKILL_DIR,
    ...LOCAL_CODEX_HOOK_FILES,
    INSTALL_META_FILE,
  ];

  return paths.map(relativeManifestPath);
}

function requirePathExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

function validateSourceTree(sourceRoot) {
  requirePathExists(path.join(sourceRoot, ".auto-ceph-work"), "workflow body");
  requirePathExists(path.join(sourceRoot, PROJECT_CONFIG_FILE), "project config");
  requirePathExists(path.join(sourceRoot, ".auto-ceph-work", "references", "runtime-contract.md"), "runtime contract");
  requirePathExists(path.join(sourceRoot, ".auto-ceph-work", "templates"), "doc templates");
  requirePathExists(path.join(sourceRoot, LOCAL_CODEX_AGENT_DIR), "custom agent directory");
  requirePathExists(path.join(sourceRoot, LOCAL_CODEX_COMMANDS_DIR), "custom command directory");
  requirePathExists(path.join(sourceRoot, LOCAL_CODEX_SKILL_DIR, "auto-ceph", "SKILL.md"), "user skill");
  requirePathExists(path.join(sourceRoot, LOCAL_CODEX_SKILL_DIR, "auto-ceph-create", "SKILL.md"), "jira create skill");
  requirePathExists(path.join(sourceRoot, LOCAL_CODEX_SKILL_DIR, "auto-ceph-approval", "SKILL.md"), "approval skill");
  requirePathExists(
    path.join(sourceRoot, ".auto-ceph-work", "references", "trombone-config.md"),
    "trombone config reference"
  );
  requirePathExists(
    path.join(sourceRoot, ".auto-ceph-work", "scripts", "approve_and_merge_review_mr.js"),
    "approval merge helper"
  );
  requirePathExists(
    path.join(sourceRoot, ".auto-ceph-work", "scripts", "run_trombone_pipeline.sh"),
    "trombone pipeline helper"
  );
  requirePathExists(
    path.join(sourceRoot, ".auto-ceph-work", "hooks", "aceph-prompt-guard.js"),
    "prompt guard hook"
  );
  requirePathExists(
    path.join(sourceRoot, ".auto-ceph-work", "hooks", "aceph-workflow-guard.js"),
    "workflow guard hook"
  );
  requirePathExists(
    path.join(sourceRoot, ".auto-ceph-work", "hooks", "lib", "project-root.js"),
    "hook support library"
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeTomlBasicString(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function stripManagedBlock(configText) {
  const pattern = new RegExp(
    `${escapeRegExp(MANAGED_BLOCK_START)}[\\s\\S]*?${escapeRegExp(MANAGED_BLOCK_END)}\\n?`,
    "g"
  );
  return configText.replace(pattern, "").replace(/\n{3,}/g, "\n\n").trimEnd();
}

function ensureCodexHooksFeature(configText) {
  const text = configText || "";
  const sectionPattern = /^\[features\]\s*$/m;
  const match = sectionPattern.exec(text);

  if (!match) {
    const prefix = text.trimEnd();
    return [
      prefix,
      prefix ? "" : null,
      "[features]",
      FEATURE_OWNERSHIP_COMMENT,
      "codex_hooks = true",
      "",
    ].filter((line) => line !== null).join("\n");
  }

  const sectionStart = match.index;
  const rest = text.slice(sectionStart);
  const nextSectionMatch = /^\[[^\]]+\]\s*$/m.exec(rest.slice(match[0].length));
  const sectionEnd = nextSectionMatch
    ? sectionStart + match[0].length + nextSectionMatch.index
    : text.length;
  const before = text.slice(0, sectionStart);
  let section = text.slice(sectionStart, sectionEnd);
  const after = text.slice(sectionEnd);

  if (/^\s*codex_hooks\s*=\s*(true|false)\s*$/m.test(section)) {
    section = section.replace(/^\s*codex_hooks\s*=\s*(true|false)\s*$/m, "codex_hooks = true");
  } else {
    section = `${section.trimEnd()}\n${FEATURE_OWNERSHIP_COMMENT}\ncodex_hooks = true\n`;
  }

  return `${before}${section}${after}`.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function stripManagedCodexHooksFeature(configText) {
  let next = configText.replace(
    new RegExp(`\\n?${escapeRegExp(FEATURE_OWNERSHIP_COMMENT)}\\n\\s*codex_hooks\\s*=\\s*true\\s*\\n?`, "g"),
    "\n"
  );

  next = next.replace(/\[features\]\n(?=\s*(?:\n|\[|$))/g, "");
  next = next.replace(/\n{3,}/g, "\n\n").trim();
  return next;
}

function getLocalCodexConfigPath(projectRoot) {
  return path.join(projectRoot, ".codex", "config.toml");
}

function getLocalCodexHooksPath(projectRoot) {
  return path.join(projectRoot, ".codex", "hooks.json");
}

function getManagedHookCommands(projectRoot) {
  const localCodexRoot = path.join(projectRoot, ".codex");
  const promptGuard = path.join(localCodexRoot, "hooks", "aceph-prompt-guard.js");
  const workflowGuard = path.join(localCodexRoot, "hooks", "aceph-workflow-guard.js");

  return [
    `node "${promptGuard}"`,
    `node "${workflowGuard}"`,
  ];
}

function buildManagedConfigBlock() {
  return "";
}

function upsertManagedConfigBlock(configText, projectRoot) {
  const base = stripManagedBlock(configText || "");
  return ensureCodexHooksFeature(base);
}

function updateLocalCodexConfig(projectRoot) {
  const configPath = getLocalCodexConfigPath(projectRoot);
  const current = readFileIfExists(configPath) || "";
  const next = upsertManagedConfigBlock(current, projectRoot);
  writeFile(configPath, next);
  return configPath;
}

function parseHooksJson(raw, hooksPath) {
  if (!raw || raw.trim() === "") {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`invalid hooks.json: ${hooksPath}: ${error.message}`);
  }
}

function isManagedHookCommand(hook, managedCommands) {
  return hook
    && hook.type === "command"
    && typeof hook.command === "string"
    && managedCommands.includes(hook.command);
}

function removeManagedHooksFromConfig(config, managedCommands) {
  const next = config && typeof config === "object" && !Array.isArray(config) ? { ...config } : {};
  const hooks = next.hooks && typeof next.hooks === "object" && !Array.isArray(next.hooks) ? { ...next.hooks } : {};

  for (const [eventName, entries] of Object.entries(hooks)) {
    if (!Array.isArray(entries)) {
      continue;
    }

    const filteredEntries = [];
    for (const entry of entries) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        filteredEntries.push(entry);
        continue;
      }

      const hookList = Array.isArray(entry.hooks)
        ? entry.hooks.filter((hook) => !isManagedHookCommand(hook, managedCommands))
        : entry.hooks;

      if (Array.isArray(hookList) && hookList.length === 0) {
        continue;
      }

      filteredEntries.push({ ...entry, hooks: hookList });
    }

    if (filteredEntries.length > 0) {
      hooks[eventName] = filteredEntries;
    } else {
      delete hooks[eventName];
    }
  }

  if (Object.keys(hooks).length > 0) {
    next.hooks = hooks;
  } else {
    delete next.hooks;
  }

  return next;
}

function upsertManagedHooksJson(hooksText, projectRoot) {
  const hooksPath = getLocalCodexHooksPath(projectRoot);
  const managedCommands = getManagedHookCommands(projectRoot);
  const parsed = parseHooksJson(hooksText, hooksPath);
  const withoutManaged = removeManagedHooksFromConfig(parsed, managedCommands);
  const hooks = withoutManaged.hooks && typeof withoutManaged.hooks === "object" && !Array.isArray(withoutManaged.hooks)
    ? { ...withoutManaged.hooks }
    : {};

  const entries = Array.isArray(hooks.PreToolUse) ? [...hooks.PreToolUse] : [];
  entries.push({
    matcher: MUTATION_MATCHER,
    hooks: managedCommands.map((command) => ({
      type: "command",
      command,
      timeout: 5,
    })),
  });

  return {
    ...withoutManaged,
    hooks: {
      ...hooks,
      PreToolUse: entries,
    },
  };
}

function updateLocalCodexHooksJson(projectRoot) {
  const hooksPath = getLocalCodexHooksPath(projectRoot);
  const current = readFileIfExists(hooksPath) || "";
  const next = upsertManagedHooksJson(current, projectRoot);
  writeFile(hooksPath, `${JSON.stringify(next, null, 2)}\n`);
  return hooksPath;
}

function removeManagedHooksJson(projectRoot) {
  const hooksPath = getLocalCodexHooksPath(projectRoot);
  const current = readFileIfExists(hooksPath);
  if (current === null) {
    return null;
  }

  const next = removeManagedHooksFromConfig(parseHooksJson(current, hooksPath), getManagedHookCommands(projectRoot));
  if (Object.keys(next).length === 0) {
    fs.rmSync(hooksPath, { force: true });
    cleanupEmptyParents(projectRoot, hooksPath);
    return hooksPath;
  }

  writeFile(hooksPath, `${JSON.stringify(next, null, 2)}\n`);
  return hooksPath;
}

function removeManagedConfig(projectRoot) {
  const configPath = getLocalCodexConfigPath(projectRoot);
  const current = readFileIfExists(configPath);
  if (current === null) {
    return null;
  }

  const next = stripManagedCodexHooksFeature(stripManagedBlock(current));
  if (next.trim() === "") {
    fs.rmSync(configPath, { force: true });
    cleanupEmptyParents(projectRoot, configPath);
    return configPath;
  }

  writeFile(configPath, `${next.trimEnd()}\n`);
  return configPath;
}

function copyManagedAssets(sourceRoot, projectRoot) {
  for (const fileName of ROOT_FILES) {
    const targetPath = path.join(projectRoot, fileName);
    copyFile(path.join(sourceRoot, fileName), targetPath);
  }

  for (const dirName of ROOT_DIRS) {
    replaceDirectory(path.join(sourceRoot, dirName), path.join(projectRoot, dirName));
  }

  replaceDirectory(
    path.join(sourceRoot, LOCAL_CODEX_AGENT_DIR),
    path.join(projectRoot, LOCAL_CODEX_AGENT_DIR)
  );
  replaceDirectory(
    path.join(sourceRoot, LOCAL_CODEX_COMMANDS_DIR),
    path.join(projectRoot, LOCAL_CODEX_COMMANDS_DIR)
  );
  replaceDirectory(
    path.join(sourceRoot, LOCAL_CODEX_SKILL_DIR),
    path.join(projectRoot, LOCAL_CODEX_SKILL_DIR)
  );

  const hooksRoot = path.join(projectRoot, ".codex", "hooks");
  ensureDir(path.join(hooksRoot, "lib"));
  copyFile(
    path.join(sourceRoot, ".auto-ceph-work", "hooks", "aceph-prompt-guard.js"),
    path.join(hooksRoot, "aceph-prompt-guard.js")
  );
  copyFile(
    path.join(sourceRoot, ".auto-ceph-work", "hooks", "aceph-workflow-guard.js"),
    path.join(hooksRoot, "aceph-workflow-guard.js")
  );
  copyFile(
    path.join(sourceRoot, ".auto-ceph-work", "hooks", "lib", "project-root.js"),
    path.join(hooksRoot, "lib", "project-root.js")
  );
}

function writeInstallMetadata(projectRoot, sourceRoot, version, managedPaths) {
  const metadata = {
    name: "auto-ceph-work",
    version,
    installed_at: new Date().toISOString(),
    project_root: projectRoot,
    source_root: sourceRoot,
    managed_paths: managedPaths,
    managed_config_path: relativeManifestPath(path.join(".codex", "config.toml")),
    managed_hooks_path: relativeManifestPath(path.join(".codex", "hooks.json")),
  };
  writeFile(path.join(projectRoot, INSTALL_META_FILE), `${JSON.stringify(metadata, null, 2)}\n`);
  return metadata;
}

function validateInstalledProject(projectRoot, managedPaths) {
  const expectedFiles = [
    path.join(projectRoot, ".codex", "hooks", "aceph-prompt-guard.js"),
    path.join(projectRoot, ".codex", "hooks", "aceph-workflow-guard.js"),
    path.join(projectRoot, ".codex", "hooks", "lib", "project-root.js"),
    path.join(projectRoot, ".codex", "agents", "aceph-ticket-intake.toml"),
    path.join(projectRoot, ".codex", "commands", "aceph", "next.md"),
    path.join(projectRoot, ".codex", "skills", "auto-ceph", "SKILL.md"),
    path.join(projectRoot, PROJECT_CONFIG_FILE),
  ];

  for (const filePath of expectedFiles) {
    requirePathExists(filePath, "installed asset");
  }

  const configText = readFileIfExists(getLocalCodexConfigPath(projectRoot)) || "";
  if (!/^\s*codex_hooks\s*=\s*true\s*$/m.test(configText)) {
    throw new Error("local .codex/config.toml did not enable codex_hooks");
  }
  if (configText.includes("[[hooks]]") || configText.includes("[[hooks.hooks]]")) {
    throw new Error("local .codex/config.toml still contains inline hook definitions");
  }

  const hooksText = readFileIfExists(getLocalCodexHooksPath(projectRoot)) || "";
  const hooksJson = parseHooksJson(hooksText, getLocalCodexHooksPath(projectRoot));
  const managedCommands = getManagedHookCommands(projectRoot);
  const preToolUseEntries = hooksJson.hooks?.PreToolUse;
  if (!Array.isArray(preToolUseEntries)) {
    throw new Error("local .codex/hooks.json did not receive PreToolUse hooks");
  }
  const installedCommands = preToolUseEntries.flatMap((entry) => Array.isArray(entry?.hooks) ? entry.hooks : [])
    .filter((hook) => hook?.type === "command")
    .map((hook) => hook.command);
  for (const command of managedCommands) {
    if (!installedCommands.includes(command)) {
      throw new Error(`local .codex/hooks.json did not reference managed hook: ${command}`);
    }
  }

  for (const relativePath of managedPaths) {
    requirePathExists(path.join(projectRoot, relativePath), "managed path");
  }
}

function installProject(options) {
  const {
    sourceRoot,
    projectRoot,
    version,
  } = options;

  validateSourceTree(sourceRoot);
  fs.rmSync(path.join(projectRoot, "doc", "_templates"), { recursive: true, force: true });
  const managedPaths = buildManagedPaths();
  copyManagedAssets(sourceRoot, projectRoot);
  const metadata = writeInstallMetadata(projectRoot, sourceRoot, version, managedPaths);
  const configPath = updateLocalCodexConfig(projectRoot);
  updateLocalCodexHooksJson(projectRoot);
  validateInstalledProject(projectRoot, managedPaths);

  return {
    metadata,
    configPath,
  };
}

function cleanupEmptyParents(projectRoot, filePath) {
  let current = path.dirname(filePath);
  while (current.startsWith(projectRoot) && current !== projectRoot) {
    if (!fs.existsSync(current)) {
      current = path.dirname(current);
      continue;
    }

    const entries = fs.readdirSync(current);
    if (entries.length > 0) {
      break;
    }

    fs.rmdirSync(current);
    current = path.dirname(current);
  }
}

function readInstallMetadata(projectRoot) {
  const metadataPath = path.join(projectRoot, INSTALL_META_FILE);
  const raw = readFileIfExists(metadataPath);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function uninstallProject(options) {
  const {
    projectRoot,
  } = options;

  const metadata = readInstallMetadata(projectRoot);
  const managedPaths = metadata?.managed_paths || buildManagedPaths();
  const removalList = [...managedPaths]
    .sort((left, right) => right.length - left.length)
    .filter((value, index, values) => values.indexOf(value) === index);

  for (const relativePath of removalList) {
    const absolutePath = path.join(projectRoot, relativePath);
    fs.rmSync(absolutePath, { recursive: true, force: true });
    cleanupEmptyParents(projectRoot, absolutePath);
  }

  const legacyPaths = [
    path.join(projectRoot, ".codex", "agents", "aceph-orchestrator.toml"),
  ];
  for (const absolutePath of legacyPaths) {
    fs.rmSync(absolutePath, { recursive: true, force: true });
    cleanupEmptyParents(projectRoot, absolutePath);
  }

  removeManagedHooksJson(projectRoot);
  const configPath = removeManagedConfig(projectRoot);
  return {
    configPath,
    removed_paths: removalList,
  };
}

function formatResult(command, projectRoot, configPath, version) {
  const lines = [
    `command: ${command}`,
    `project_root: ${projectRoot}`,
  ];

  if (version) {
    lines.push(`version: ${version}`);
  }
  if (configPath) {
    lines.push(`local_codex_config: ${configPath}`);
  }

  return lines.join("\n");
}

function main(argv, options = {}) {
  const commandName = options.commandName || "auto-ceph-work";
  const args = parseArgs(argv);
  if (!["install", "update", "uninstall"].includes(args.command)) {
    throw new Error(`unsupported command: ${args.command}`);
  }

  if (args.command === "uninstall") {
    const result = uninstallProject({
      projectRoot: args.project,
    });
    process.stdout.write(`${formatResult(args.command, args.project, result.configPath)}\n`);
    return;
  }

  const result = installProject({
    sourceRoot: args.source,
    projectRoot: args.project,
    version: args.version,
  });
  process.stdout.write(`${formatResult(args.command, args.project, result.configPath, args.version)}\n`);
}

if (require.main === module) {
  try {
    main(process.argv.slice(2), {
      commandName: path.basename(process.argv[1] || "auto-ceph-work"),
    });
  } catch (error) {
    const commandName = path.basename(process.argv[1] || "auto-ceph-work");
    process.stderr.write(`${error.message}\n\n${usage(commandName)}\n`);
    process.exit(1);
  }
}

module.exports = {
  INSTALL_META_FILE,
  MANAGED_BLOCK_END,
  MANAGED_BLOCK_START,
  buildManagedConfigBlock,
  buildManagedPaths,
  ensureCodexHooksFeature,
  getPackageVersion,
  getLocalCodexHooksPath,
  getManagedHookCommands,
  installProject,
  main,
  parseArgs,
  removeManagedConfig,
  removeManagedHooksJson,
  stripManagedBlock,
  uninstallProject,
  upsertManagedHooksJson,
  upsertManagedConfigBlock,
  usage,
};
