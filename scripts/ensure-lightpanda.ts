#!/usr/bin/env bun
/**
 * Download the Lightpanda browser used by `bun run sync` if it is missing.
 *
 * Usage: bun scripts/ensure-lightpanda.ts [--upgrade] [--soft]
 *   --upgrade  Re-download the latest nightly even when a binary exists
 *   --soft     Warn instead of failing (used by postinstall; sync falls back to a plain fetch)
 */
import { errorMessage } from "./lib/docs";
import { ensureLightpanda, lightpandaVersion } from "./lib/lightpanda";

const upgrade = Bun.argv.includes("--upgrade");
const soft = Bun.argv.includes("--soft");

try {
  const binary = await ensureLightpanda({ upgrade });
  console.log(`Lightpanda ${lightpandaVersion(binary)} at ${binary}`);
} catch (error) {
  console.warn(`warning: Lightpanda unavailable: ${errorMessage(error)}`);
  console.warn("bun run sync will read the guides page with a plain fetch instead.");
  if (!soft) process.exitCode = 1;
}
