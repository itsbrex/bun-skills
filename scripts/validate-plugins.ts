#!/usr/bin/env bun
import { validatePlugins } from "./lib/plugins";

const problems = await validatePlugins();
console.log(`plugins: Claude + Codex · problems: ${problems.length}`);
if (problems.length) {
  console.error(`  ${problems.join("\n  ")}`);
  process.exitCode = 1;
}
