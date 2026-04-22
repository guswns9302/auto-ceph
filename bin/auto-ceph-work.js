#!/usr/bin/env node
"use strict";

const { main, usage } = require("../scripts/release-installer.js");

const commandName = "auto-ceph-work";

try {
  main(process.argv.slice(2), {
    commandName,
  });
} catch (error) {
  process.stderr.write(`${error.message}\n\n${usage(commandName)}\n`);
  process.exit(1);
}
