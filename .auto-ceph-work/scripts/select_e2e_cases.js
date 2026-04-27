#!/usr/bin/env node
"use strict";

const fs = require("node:fs");

function usage() {
  return [
    "usage:",
    "  select_e2e_cases.js menu-list <target-case-json>",
    "  select_e2e_cases.js select <target-case-json> <menu1>",
  ].join("\n");
}

function fail(message) {
  process.stderr.write(`select_e2e_cases: ${message}\n`);
  process.exit(1);
}

function readCases(filePath) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`failed to read or parse target case JSON: ${error.message}`);
  }

  if (!parsed || !Array.isArray(parsed.features)) {
    fail("target case JSON must contain a features[] array");
  }
  return parsed;
}

function menuOf(step) {
  if (!step || !Array.isArray(step.menu_path) || step.menu_path.length === 0) {
    return null;
  }
  return String(step.menu_path[0] || "").trim() || null;
}

function compactStep(step) {
  return {
    menu_path: Array.isArray(step.menu_path) ? step.menu_path.map(String) : [],
    procedure: step.procedure == null ? "" : String(step.procedure),
    expected_result: step.expected_result == null ? "" : String(step.expected_result),
  };
}

function compactFeature(feature, steps) {
  return {
    feature_name: feature.feature_name == null ? "" : String(feature.feature_name),
    category: feature.category == null ? "" : String(feature.category),
    steps: steps.map(compactStep),
  };
}

function listMenus(cases) {
  const seen = new Set();
  const menus = [];
  for (const feature of cases.features) {
    for (const step of feature.steps || []) {
      const menu = menuOf(step);
      if (menu && !seen.has(menu)) {
        seen.add(menu);
        menus.push(menu);
      }
    }
  }

  if (menus.length === 0) {
    fail("no menu1 values found in features[].steps[].menu_path[0]");
  }
  return { menus };
}

function selectMenu(cases, menu1) {
  const selected = [];
  for (const feature of cases.features) {
    const steps = (feature.steps || []).filter((step) => menuOf(step) === menu1);
    if (steps.length > 0) {
      selected.push(compactFeature(feature, steps));
    }
  }

  if (selected.length === 0) {
    fail(`no test cases found for menu1: ${menu1}`);
  }
  return { menu1, features: selected };
}

function main(argv) {
  const [command, filePath, menu1] = argv;
  if (!command || !filePath || (command === "select" && !menu1)) {
    fail(usage());
  }

  const cases = readCases(filePath);
  let result;
  if (command === "menu-list") {
    result = listMenus(cases);
  } else if (command === "select") {
    result = selectMenu(cases, menu1);
  } else {
    fail(`unknown command: ${command}\n${usage()}`);
  }

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main(process.argv.slice(2));
