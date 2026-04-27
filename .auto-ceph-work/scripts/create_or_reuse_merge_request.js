"use strict";

const fs = require("fs");
const { spawnSync } = require("node:child_process");

function fail(message, details) {
  const suffix = details ? `: ${details}` : "";
  console.error(`${message}${suffix}`);
  process.exit(1);
}

function parseArgs(argv) {
  if (argv.length < 5) {
    fail("usage", "create_or_reuse_merge_request.js <TICKET-ID> <SOURCE> <TARGET> <TITLE> <SUMMARY-FILE>");
  }

  const [ticketId, source, target, title, summaryFile] = argv;
  return { ticketId, source, target, title, summaryFile };
}

function runGlab(glabBin, args) {
  const result = spawnSync(glabBin, args, {
    encoding: "utf8",
    env: process.env,
  });

  if (result.error) {
    fail("failed to execute glab", result.error.message);
  }

  if (result.status !== 0) {
    fail("glab command failed", (result.stderr || result.stdout || "").trim());
  }

  return result.stdout;
}

function listOpenMergeRequests(glabBin, source, target) {
  const stdout = runGlab(glabBin, [
    "mr",
    "list",
    "--state",
    "opened",
    "--source-branch",
    source,
    "--target-branch",
    target,
    "--json",
    "title,web_url,source_branch,target_branch",
  ]);

  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    fail("failed to parse glab mr list output", error.message);
  }

  if (!Array.isArray(parsed)) {
    fail("unexpected glab mr list output", "expected an array");
  }

  return parsed;
}

function findMatchingMergeRequest(mergeRequests, source, target, title) {
  return mergeRequests.find((mergeRequest) => {
    return mergeRequest
      && mergeRequest.source_branch === source
      && mergeRequest.target_branch === target
      && (!title || mergeRequest.title === title || typeof mergeRequest.title === "string");
  });
}

function createMergeRequest(glabBin, source, target, title, summaryFile) {
  if (!fs.existsSync(summaryFile)) {
    fail("summary file not found", summaryFile);
  }

  runGlab(glabBin, [
    "mr",
    "create",
    "--source-branch",
    source,
    "--target-branch",
    target,
    "--title",
    title,
    "--description-file",
    summaryFile,
    "--yes",
  ]);
}

function emitResult(result) {
  process.stdout.write(
    [
      `status=${result.status}`,
      `title=${result.title}`,
      `url=${result.url}`,
      `source=${result.source}`,
      `target=${result.target}`,
      "",
    ].join("\n")
  );
}

function main() {
  const { ticketId, source, target, title, summaryFile } = parseArgs(process.argv.slice(2));
  const glabBin = process.env.GLAB_BIN || "glab";

  let mergeRequests = listOpenMergeRequests(glabBin, source, target);
  let mergeRequest = findMatchingMergeRequest(mergeRequests, source, target, title);

  if (mergeRequest) {
    emitResult({
      status: "reused",
      title: mergeRequest.title,
      url: mergeRequest.web_url,
      source,
      target,
      ticketId,
    });
    return;
  }

  createMergeRequest(glabBin, source, target, title, summaryFile);

  mergeRequests = listOpenMergeRequests(glabBin, source, target);
  mergeRequest = findMatchingMergeRequest(mergeRequests, source, target, title);

  if (!mergeRequest) {
    fail("merge request not found after create", `${ticketId} ${source} -> ${target}`);
  }

  emitResult({
    status: "created",
    title: mergeRequest.title,
    url: mergeRequest.web_url,
    source,
    target,
    ticketId,
  });
}

main();
