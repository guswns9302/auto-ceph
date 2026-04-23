#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const PROJECT_DIR = ".auto-ceph-work";
const PROJECT_CONFIG_FILE = "project.json";
const DEFAULT_CONFIG = {
  version: 1,
  workflow: "auto-ceph-ticket-loop",
  docs_root: ".auto-ceph-work/tickets",
  ticket_root_pattern: ".auto-ceph-work/tickets/<TICKET-ID>",
};

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function normalizeDocsRoot(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return DEFAULT_CONFIG.docs_root;
  }
  return value.replace(/^\.?\//, "").replace(/\/+$/, "") || DEFAULT_CONFIG.docs_root;
}

function findProjectRoot(startDir) {
  let current = path.resolve(startDir || process.cwd());

  while (true) {
    const canonicalDir = path.join(current, PROJECT_DIR);
    const configPath = path.join(canonicalDir, PROJECT_CONFIG_FILE);
    if (fs.existsSync(canonicalDir)) {
      const parsed = readJson(configPath);
      if (!parsed || parsed.workflow !== DEFAULT_CONFIG.workflow) {
        return null;
      }

      const config = {
        ...DEFAULT_CONFIG,
        ...parsed,
        docs_root: normalizeDocsRoot(parsed.docs_root),
      };

      return {
        rootDir: current,
        canonicalDir,
        configPath,
        config,
      };
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function isPathInside(rootDir, targetPath) {
  const relative = path.relative(rootDir, targetPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function normalizePathAgainst(baseDir, filePath) {
  if (!filePath || typeof filePath !== "string") {
    return null;
  }

  const absolute = path.isAbsolute(filePath)
    ? path.resolve(filePath)
    : path.resolve(baseDir, filePath);

  if (!isPathInside(baseDir, absolute)) {
    return null;
  }

  return {
    absolute,
    relative: path.relative(baseDir, absolute).replace(/\\/g, "/"),
  };
}

function normalizeToolPath(project, filePath) {
  const projectPath = normalizePathAgainst(project.rootDir, filePath);
  if (!projectPath) {
    return null;
  }
  return {
    ...projectPath,
    scope: "project",
    display: projectPath.relative,
  };
}

function listTicketDirs(project) {
  const docsDir = path.join(project.rootDir, project.config.docs_root);
  if (!fs.existsSync(docsDir)) {
    return [];
  }

  return fs.readdirSync(docsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => {
      const absolute = path.join(docsDir, entry.name);
      const stat = fs.statSync(absolute);
      return {
        ticketId: entry.name,
        absolute,
        mtimeMs: stat.mtimeMs,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function detectTicketFromPath(project, relativePath) {
  const prefix = `${project.config.docs_root}/`;
  if (!relativePath.startsWith(prefix)) {
    return null;
  }

  const rest = relativePath.slice(prefix.length);
  const [ticketId] = rest.split("/");
  if (!ticketId || ticketId === "_templates") {
    return null;
  }
  return ticketId;
}

function resolveLikelyTicket(project, normalizedPath) {
  if (normalizedPath) {
    const fromPath = detectTicketFromPath(project, normalizedPath.relative);
    if (fromPath) {
      return fromPath;
    }
  }

  const tickets = listTicketDirs(project);
  if (tickets.length === 1) {
    return tickets[0].ticketId;
  }
  if (tickets.length > 1) {
    return tickets[0].ticketId;
  }
  return null;
}

module.exports = {
  DEFAULT_CONFIG,
  PROJECT_CONFIG_FILE,
  PROJECT_DIR,
  findProjectRoot,
  normalizeToolPath,
  listTicketDirs,
  resolveLikelyTicket,
};
