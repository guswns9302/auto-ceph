#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");

function fail(message, details) {
  const suffix = details ? `: ${details}` : "";
  console.error(`${message}${suffix}`);
  process.exit(1);
}

function parseArgs(argv) {
  if (argv.length < 3) {
    fail("usage", "approve_and_merge_review_mr.js <TICKET-ID> <SOURCE> <TARGET>");
  }

  const [ticketId, source, target] = argv;
  return { ticketId, source, target };
}

function runGlab(glabBin, args, allowFailure = false) {
  const result = spawnSync(glabBin, args, {
    encoding: "utf8",
    env: process.env,
  });

  if (result.error) {
    if (!allowFailure) {
      fail("failed to execute glab", result.error.message);
    }
    return result;
  }

  if (!allowFailure && result.status !== 0) {
    fail("glab command failed", (result.stderr || result.stdout || "").trim());
  }

  return result;
}

function parseJson(stdout, label) {
  try {
    return JSON.parse(stdout);
  } catch (error) {
    fail(`failed to parse ${label}`, error.message);
  }
}

function listOpenMergeRequests(glabBin, source, target) {
  const result = runGlab(glabBin, [
    "mr",
    "list",
    "--state",
    "opened",
    "--source-branch",
    source,
    "--target-branch",
    target,
    "--json",
    "iid,title,web_url,source_branch,target_branch",
  ]);
  const parsed = parseJson(result.stdout, "glab mr list output");
  if (!Array.isArray(parsed)) {
    fail("unexpected glab mr list output", "expected an array");
  }
  return parsed;
}

function findMatchingMergeRequest(mergeRequests, source, target) {
  return mergeRequests.find((mergeRequest) => {
    return mergeRequest
      && mergeRequest.source_branch === source
      && mergeRequest.target_branch === target;
  });
}

function approveMergeRequest(glabBin, mergeRequest) {
  runGlab(glabBin, ["mr", "approve", mergeRequest.web_url || String(mergeRequest.iid)]);
}

function readMergeRequest(glabBin, mergeRequest) {
  const result = runGlab(glabBin, [
    "mr",
    "view",
    mergeRequest.web_url || String(mergeRequest.iid),
    "--json",
    "state,title,web_url,source_branch,target_branch",
  ]);
  const parsed = parseJson(result.stdout, "glab mr view output");
  if (!parsed || Array.isArray(parsed)) {
    fail("unexpected glab mr view output", "expected an object");
  }
  return parsed;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntilMergeableAndMerge(glabBin, mergeRequest, timeoutMs, intervalMs) {
  const reference = mergeRequest.web_url || String(mergeRequest.iid);
  const deadline = Date.now() + timeoutMs;
  let lastFailure = "merge did not succeed";

  while (Date.now() <= deadline) {
    const mergeResult = runGlab(glabBin, ["mr", "merge", reference, "--yes"], true);
    if (mergeResult.error) {
      lastFailure = mergeResult.error.message;
    } else if (mergeResult.status === 0) {
      return;
    } else {
      lastFailure = (mergeResult.stderr || mergeResult.stdout || "").trim() || `exit ${mergeResult.status}`;
    }

    const viewed = runGlab(glabBin, ["mr", "view", reference, "--json", "state"], true);
    if (!viewed.error && viewed.status === 0) {
      const parsed = parseJson(viewed.stdout, "glab mr view output");
      if (parsed && parsed.state === "merged") {
        return;
      }
    }

    if (Date.now() + intervalMs > deadline) {
      break;
    }
    await delay(intervalMs);
  }

  fail("merge request did not become mergeable before timeout", lastFailure);
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

async function main() {
  const { ticketId, source, target } = parseArgs(process.argv.slice(2));
  const glabBin = process.env.GLAB_BIN || "glab";
  const timeoutMs = Number(process.env.MR_MERGE_TIMEOUT_MS || 120000);
  const intervalMs = Number(process.env.MR_MERGE_RETRY_INTERVAL_MS || 5000);

  const mergeRequests = listOpenMergeRequests(glabBin, source, target);
  const mergeRequest = findMatchingMergeRequest(mergeRequests, source, target);

  if (!mergeRequest) {
    fail("open merge request not found", `${ticketId} ${source} -> ${target}`);
  }

  approveMergeRequest(glabBin, mergeRequest);
  await waitUntilMergeableAndMerge(glabBin, mergeRequest, timeoutMs, intervalMs);

  const merged = readMergeRequest(glabBin, mergeRequest);
  if (merged.state !== "merged") {
    fail("merge request was not merged", `${ticketId} ${merged.state || "unknown"}`);
  }

  if (merged.target_branch !== target) {
    fail("merge request target mismatch after merge", `${merged.target_branch || "unknown"} != ${target}`);
  }

  emitResult({
    status: "merged",
    title: merged.title,
    url: merged.web_url,
    source: merged.source_branch,
    target: merged.target_branch,
  });
}

main().catch((error) => {
  fail("unexpected error", error && error.message ? error.message : String(error));
});
