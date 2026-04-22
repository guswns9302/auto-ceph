#!/usr/bin/env node
"use strict";

const fs = require("fs");

function usage() {
  return [
    "usage:",
    "  update_jira_work_note_section.js <description-file> <stage> <mode> <block-file>",
    "",
    "modes:",
    "  start    ensure the stage header exists and replace that stage block with the block file",
    "  summary  replace the matching stage block with the block file",
  ].join("\n");
}

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function normalizeTrailingNewline(value) {
  return value.endsWith("\n") ? value : `${value}\n`;
}

function getSectionRange(lines, headerPrefix) {
  const start = lines.findIndex((line) => line.trim() === headerPrefix);
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

function findStageBlock(lines, stage) {
  const header = `#### ${stage}`;
  const start = lines.findIndex((line) => line.trim() === header);
  if (start === -1) {
    return null;
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^####\s+/.test(lines[i]) || /^###\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }

  return { start, end };
}

function ensureWorkNoteSection(description) {
  const normalized = normalizeTrailingNewline(description);
  const lines = normalized.split("\n");
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
  return {
    lines: next.concat([""]),
    range: getSectionRange(next.concat([""]), "### 작업 노트"),
  };
}

function replaceStageBlock(description, stage, replacementBlock) {
  const ensured = ensureWorkNoteSection(description);
  const lines = ensured.lines;
  const section = getSectionRange(lines, "### 작업 노트");
  const sectionLines = lines.slice(section.start, section.end);
  const stageBlock = findStageBlock(sectionLines, stage);
  const replacementLines = normalizeTrailingNewline(replacementBlock).split("\n");

  let nextSectionLines;
  if (stageBlock) {
    nextSectionLines = [
      ...sectionLines.slice(0, stageBlock.start),
      ...replacementLines,
      ...sectionLines.slice(stageBlock.end),
    ];
  } else {
    nextSectionLines = [...sectionLines];
    if (nextSectionLines.length > 0 && nextSectionLines[nextSectionLines.length - 1] !== "") {
      nextSectionLines.push("");
    }
    nextSectionLines.push(...replacementLines);
  }

  const merged = [
    ...lines.slice(0, section.start),
    ...nextSectionLines,
    ...lines.slice(section.end),
  ];

  return normalizeTrailingNewline(merged.join("\n").replace(/\n{3,}/g, "\n\n"));
}

function main(argv) {
  if (argv.length < 4) {
    process.stderr.write(`${usage()}\n`);
    process.exit(1);
  }

  const [descriptionFile, stage, mode, blockFile] = argv;
  if (!["start", "summary"].includes(mode)) {
    process.stderr.write(`${usage()}\n`);
    process.exit(1);
  }

  const description = readFile(descriptionFile);
  const block = readFile(blockFile);
  const next = replaceStageBlock(description, stage, block);
  process.stdout.write(next);
}

main(process.argv.slice(2));
