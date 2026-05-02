#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const appAsarPath = path.join(
  repoRoot,
  "release",
  "win-unpacked",
  "resources",
  "app.asar"
);
const asarCliPath = path.join(
  repoRoot,
  "node_modules",
  "@electron",
  "asar",
  "bin",
  "asar.js"
);

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!existsSync(appAsarPath)) {
  fail(
    `Packaged app archive was not found at ${appAsarPath}. Run npm run package:dir first.`
  );
}

if (!existsSync(asarCliPath)) {
  fail(
    `The @electron/asar CLI was not found at ${asarCliPath}. Run npm ci before checking the package.`
  );
}

const result = spawnSync(process.execPath, [asarCliPath, "list", appAsarPath], {
  cwd: repoRoot,
  encoding: "utf8"
});

if (result.error) {
  fail(`Could not list ${appAsarPath}: ${result.error.message}`);
}

if (result.status !== 0) {
  fail(
    [`Could not list ${appAsarPath}.`, result.stderr.trim(), result.stdout.trim()]
      .filter(Boolean)
      .join("\n")
  );
}

const sourceMaps = result.stdout
  .split(/\r?\n/)
  .map((entry) => entry.trim())
  .filter((entry) => entry.length > 0 && /\.map$/i.test(entry));

if (sourceMaps.length > 0) {
  const sample = sourceMaps.slice(0, 20).join("\n");
  fail(
    [
      `Packaged app.asar contains ${sourceMaps.length} source map file(s).`,
      sample
    ].join("\n")
  );
}

console.log("Packaged app.asar contains 0 source map files.");
