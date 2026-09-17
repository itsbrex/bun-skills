#!/usr/bin/env bun
import { REPO_ROOT } from "./lib/docs";

const args = Bun.argv.slice(2);
const sync = Bun.spawn([process.execPath, "scripts/sync-skills.ts", ...args], { cwd: REPO_ROOT, stdout: "inherit", stderr: "inherit" });
const syncExit = await sync.exited;
if (syncExit !== 0 || args.includes("--dry-run") || args.includes("--help") || args.includes("-h")) process.exit(syncExit);
const validate = Bun.spawn([process.execPath, "scripts/validate-skills.ts"], { cwd: REPO_ROOT, stdout: "inherit", stderr: "inherit" });
process.exitCode = await validate.exited;
