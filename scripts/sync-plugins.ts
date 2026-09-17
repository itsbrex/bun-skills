#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { errorMessage } from "./lib/docs";
import { syncPlugins } from "./lib/plugins";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: { "dry-run": { type: "boolean", default: false }, check: { type: "boolean", default: false } },
});

try {
  const result = await syncPlugins({ dryRun: values["dry-run"] || values.check });
  console.log(`plugins: Claude + Codex ${result.version} · ${result.skillCount} shared skills · ${result.changed.length} files ${result.dryRun ? "would change" : "changed"}`);
  if (result.changed.length) console.log(`  ${result.changed.join("\n  ")}`);
  if (values.check && result.changed.length) process.exitCode = 1;
} catch (error) {
  console.error(`error: ${errorMessage(error)}`);
  process.exitCode = 1;
}
