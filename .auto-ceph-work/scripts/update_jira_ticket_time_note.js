#!/usr/bin/env node
"use strict";

const fs = require("fs");
const { execFileSync } = require("child_process");

function usage() {
  return [
    "usage:",
    "  update_jira_ticket_time_note.js <description-file> <start|end> [timestamp]",
  ].join("\n");
}

function normalizeTrailingNewline(value) {
  return value.endsWith("\n") ? value : `${value}\n`;
}

function currentTimestamp() {
  return execFileSync("date", ["+%Y-%m-%d %H:%M:%S %Z"], { encoding: "utf8" }).trim();
}

function getSectionRange(lines, header) {
  const start = lines.findIndex((line) => line.trim() === header);
  if (start === -1) {
    return null;
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^###\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }

  return { start, end };
}

function ensureWorkNoteSection(description) {
  const lines = normalizeTrailingNewline(description).split("\n");
  const range = getSectionRange(lines, "### 작업 노트");
  if (range) {
    return { lines, range };
  }

  const next = [...lines];
  if (next.length > 0 && next[next.length - 1] === "") {
    next.pop();
  }
  if (next.length > 0 && next[next.length - 1] !== "") {
    next.push("");
  }
  next.push("### 작업 노트", "");
  const ensured = next.concat([""]);
  return {
    lines: ensured,
    range: getSectionRange(ensured, "### 작업 노트"),
  };
}

function parseTimeLine(line, label) {
  const pattern = new RegExp(`^-\\s*${label}\\s*:\\s*(.*)$`);
  const match = line.match(pattern);
  return match ? match[1].trim() : null;
}

function updateTicketTimeNote(description, mode, timestamp) {
  const ensured = ensureWorkNoteSection(description);
  const lines = ensured.lines;
  const section = getSectionRange(lines, "### 작업 노트");
  const sectionLines = lines.slice(section.start, section.end);
  const body = sectionLines.slice(1);

  let startTime = "";
  let endTime = "";
  const remaining = [];

  for (const line of body) {
    const parsedStart = parseTimeLine(line, "티켓 시작 시간");
    if (parsedStart !== null) {
      if (!startTime) {
        startTime = parsedStart;
      }
      continue;
    }

    const parsedEnd = parseTimeLine(line, "티켓 종료 시간");
    if (parsedEnd !== null) {
      if (!endTime) {
        endTime = parsedEnd;
      }
      continue;
    }

    remaining.push(line);
  }

  if (mode === "start" && !startTime) {
    startTime = timestamp;
  }
  if (mode === "end") {
    endTime = timestamp;
  }

  while (remaining.length > 0 && remaining[0] === "") {
    remaining.shift();
  }

  const nextSectionLines = [
    "### 작업 노트",
    "",
    startTime ? `- 티켓 시작 시간: ${startTime}` : "- 티켓 시작 시간:",
    endTime ? `- 티켓 종료 시간: ${endTime}` : "- 티켓 종료 시간:",
    "",
    ...remaining,
  ];

  const merged = [
    ...lines.slice(0, section.start),
    ...nextSectionLines,
    ...lines.slice(section.end),
  ];

  return normalizeTrailingNewline(merged.join("\n").replace(/\n{3,}/g, "\n\n"));
}

function main(argv) {
  if (argv.length < 2 || argv.length > 3) {
    process.stderr.write(`${usage()}\n`);
    process.exit(1);
  }

  const [descriptionFile, mode, explicitTimestamp] = argv;
  if (!["start", "end"].includes(mode)) {
    process.stderr.write(`${usage()}\n`);
    process.exit(1);
  }

  const timestamp = explicitTimestamp || currentTimestamp();
  const description = fs.readFileSync(descriptionFile, "utf8");
  process.stdout.write(updateTicketTimeNote(description, mode, timestamp));
}

main(process.argv.slice(2));
