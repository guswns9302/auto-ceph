#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const {
  findProjectRoot,
  normalizeToolPath,
  resolveLikelyTicket,
} = require("./lib/project-root");

function readStdin(timeoutMs) {
  return new Promise((resolve) => {
    let input = "";
    const timer = setTimeout(() => resolve(null), timeoutMs);
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      input += chunk;
    });
    process.stdin.on("end", () => {
      clearTimeout(timer);
      resolve(input);
    });
  });
}

function isMutationTool(toolName) {
  return [
    "Write",
    "Edit",
    "MultiEdit",
    "apply_patch",
    "functions.apply_patch",
  ].includes(toolName);
}

function getFilePath(data) {
  return data?.tool_input?.file_path ||
    data?.tool_input?.path ||
    data?.tool_input?.target_file ||
    null;
}

function isGuardedPath(relativePath) {
  const ignoredPrefixes = [
    ".git/",
    "node_modules/",
  ];
  return !ignoredPrefixes.some((prefix) => relativePath.startsWith(prefix));
}

function detectStage(project, ticketId) {
  if (!ticketId) {
    return null;
  }

  const scriptPath = path.join(project.rootDir, ".auto-ceph-work", "scripts", "detect_ticket_stage.sh");
  if (!fs.existsSync(scriptPath)) {
    return null;
  }

  try {
    return execFileSync("bash", [scriptPath, ticketId], {
      cwd: project.rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function fileExists(project, ticketId, fileName) {
  if (!ticketId) {
    return false;
  }
  return fs.existsSync(path.join(project.rootDir, project.config.docs_root, ticketId, fileName));
}

function buildAdvisory(target, ticketId, stage, reason) {
  const ticketPart = ticketId ? `Active ticket guess: ${ticketId}. ` : "";
  const stagePart = stage ? `Current recommended stage: ${stage}. ` : "";
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext:
        `AUTO-CEPH WORKFLOW WARNING: You're modifying ${target.relative}. ` +
        ticketPart +
        stagePart +
        `${reason} Proceed only if this edit is intentional and consistent with the ticket loop.`,
    },
  };
}

function classifyReason(project, target, ticketId, stage) {
  const docsRoot = `${project.config.docs_root}/`;
  const isReviewWrite = target.relative.endsWith("/06_REVIEW.md");
  const isSummaryWrite = target.relative.endsWith("/07_SUMMARY.md");
  const isCodeLike =
    !target.relative.startsWith(docsRoot) &&
    !target.relative.startsWith(".codex/");

  if (ticketId && isReviewWrite && !fileExists(project, ticketId, "05_UAT.md")) {
    return "06_REVIEW.md should not be written before 05_UAT.md exists.";
  }

  if (ticketId && isSummaryWrite && !fileExists(project, ticketId, "06_REVIEW.md")) {
    return "07_SUMMARY.md should not be written before 06_REVIEW.md exists.";
  }

  if (!ticketId && isCodeLike) {
    return "No active ticket docs were detected for this project. Start with 문제 확인 before editing implementation files.";
  }

  if (ticketId && isCodeLike && !fileExists(project, ticketId, "03_PLAN.md")) {
    return "Code edits usually require 03_PLAN.md first.";
  }

  if (ticketId && isCodeLike && (stage === "문제 확인" || stage === "문제 검토" || stage === "계획")) {
    return "Code edits started before the ticket reached 수행.";
  }

  if (ticketId && target.relative.endsWith("/04_EXECUTION.md") && !fileExists(project, ticketId, "03_PLAN.md")) {
    return "04_EXECUTION.md should not be advanced before 03_PLAN.md exists.";
  }

  return null;
}

async function main() {
  const raw = await readStdin(3000);
  if (!raw) {
    return;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return;
  }

  if (!isMutationTool(data?.tool_name)) {
    return;
  }

  const project = findProjectRoot(data?.cwd || process.cwd());
  if (!project) {
    return;
  }

  const target = normalizeToolPath(project, getFilePath(data));
  if (!target || !isGuardedPath(target.relative)) {
    return;
  }

  const ticketId = resolveLikelyTicket(project, target);
  const stage = detectStage(project, ticketId);
  const reason = classifyReason(project, target, ticketId, stage);
  if (!reason) {
    return;
  }

  process.stdout.write(JSON.stringify(buildAdvisory(target, ticketId, stage, reason)));
}

main().catch(() => process.exit(0));
