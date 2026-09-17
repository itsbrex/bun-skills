#!/usr/bin/env bun
/**
 * Regenerate skills/<dir>/SKILL.md from the Bun docs.
 *
 * Pages come from https://bun.com/docs/llms.txt and each page's markdown export. The guides index
 * skill is built from the categories on https://bun.com/guides, rendered with the Lightpanda browser
 * (falling back to a plain fetch). Existing files are rewritten only when content changed.
 *
 * Usage: bun run sync [--dry-run] [--prune] [--no-browser] [--concurrency N]
 */
import { mkdir, readdir, rm } from "node:fs/promises";
import { parseArgs } from "node:util";
import {
  CACHE_DIR,
  type DocEntry,
  MAX_DESCRIPTION_LENGTH,
  MAX_SKILL_NAME_LENGTH,
  SKILLS_DIR,
  errorMessage,
  fetchText,
  loadDocIndex,
  markdownUrlFor,
  renderSkillFile,
} from "./lib/docs";
import { loadGuidesPage, renderGuidesIndexBody } from "./lib/guides";
import { loadPluginConfig, syncPlugins } from "./lib/plugins";

// Keyed by docs path. Pages whose `Bun <title>` name is over 64 characters or collides with another page's.
const NAME_OVERRIDES: Record<string, string> = {
  "guides/install/registry-scope": "Bun Configure private registry for org scope",
  "runtime/http/cookies": "Bun HTTP Cookies",
  "runtime/plugins": "Bun Runtime Plugins",
};

// More stale directories than this share of llms.txt pages means parsing broke, not that pages left.
const MAX_PRUNE_FRACTION = 0.1;
const REPORT_PATH = `${CACHE_DIR}/sync-report.json`;

const { values: args } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    "dry-run": { type: "boolean", default: false },
    prune: { type: "boolean", default: false },
    "no-browser": { type: "boolean", default: false },
    concurrency: { type: "string", default: "12" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (args.help) {
  console.log(`Usage: bun run sync [options]

  --dry-run         Report what would change without writing skill files
  --prune           Delete skill directories whose page is no longer in llms.txt
  --no-browser      Skip Lightpanda and read the guides page with a plain fetch
  --concurrency N   Parallel page downloads (default 12)`);
  process.exit(0);
}

const dryRun = args["dry-run"];
const concurrency = Math.max(1, Number.parseInt(args.concurrency, 10) || 12);
const warnings: string[] = [];

// A leftover report from an earlier run must not be mistaken for this run's result.
await rm(REPORT_PATH, { force: true });

// Fail before downloading or writing skills when shared metadata is invalid.
await loadPluginConfig();

let entries: DocEntry[];
try {
  entries = await loadDocIndex();
} catch (error) {
  console.error(`error: ${errorMessage(error)}; nothing was written`);
  process.exit(1);
}

const guidesPage = await loadGuidesPage({ useBrowser: !args["no-browser"] });
warnings.push(...guidesPage.warnings);
console.log(
  `llms.txt: ${entries.length} pages · guides page: ${guidesPage.categories.length} categories (${guidesPage.source})`,
);

const skillFileFor = (entry: DocEntry) => Bun.file(`${SKILLS_DIR}/${entry.dir}/SKILL.md`);

function truncateAtWord(text: string, maxLength: number, suffix = "") {
  const cut = text.slice(0, maxLength - suffix.length);
  const space = cut.lastIndexOf(" ");
  return `${(space > 0 ? cut.slice(0, space) : cut).trim()}${suffix}`;
}

async function bodyFor(entry: DocEntry): Promise<string> {
  if (entry.path === "guides/index") {
    if (guidesPage.source === "none" && (await skillFileFor(entry).exists())) {
      throw new Error("guide categories unavailable from https://bun.com/guides; kept the existing skill");
    }
    return renderGuidesIndexBody(entry, entries, guidesPage, warnings);
  }
  const url = markdownUrlFor(entry.path);
  const markdown = await fetchText(url, { accept: "text/markdown" });
  if (/^\s*<(!doctype|html)/i.test(markdown)) throw new Error(`${url} returned HTML, not markdown`);
  if (markdown.trim() === "") throw new Error(`${url} returned an empty body`);
  return markdown;
}

function nameFor(entry: DocEntry): string {
  const wanted = NAME_OVERRIDES[entry.path] ?? `Bun ${entry.title}`;
  if (wanted.length <= MAX_SKILL_NAME_LENGTH) return wanted;
  const truncated = truncateAtWord(wanted, MAX_SKILL_NAME_LENGTH);
  warnings.push(
    `${entry.path}: name "${wanted}" is over ${MAX_SKILL_NAME_LENGTH} chars, truncated to "${truncated}"; add a NAME_OVERRIDES entry`,
  );
  return truncated;
}

function descriptionFor(entry: DocEntry): string {
  // Some skill validators (claude.ai uploads, for one) reject XML-like tags in descriptions,
  // so `create-<template>` becomes `create-{template}`.
  const description = entry.description.replace(/<([^<>]*)>/g, "{$1}");
  if (/[<>]/.test(description)) warnings.push(`${entry.path}: description contains an unpaired < or >`);
  if (description.length <= MAX_DESCRIPTION_LENGTH) return description;
  warnings.push(`${entry.path}: description is over ${MAX_DESCRIPTION_LENGTH} chars, truncated`);
  return truncateAtWord(description, MAX_DESCRIPTION_LENGTH, "…");
}

type Outcome = "created" | "updated" | "unchanged" | "failed";
const results: Record<Outcome, string[]> = { created: [], updated: [], unchanged: [], failed: [] };
const pathsByName = new Map<string, string[]>();
const projectedSkills = new Map<string, string>();

async function syncEntry(entry: DocEntry) {
  const name = nameFor(entry);
  pathsByName.set(name, [...(pathsByName.get(name) ?? []), entry.path]);

  let content: string;
  try {
    content = renderSkillFile({ name, description: descriptionFor(entry), body: await bodyFor(entry) });
  } catch (error) {
    results.failed.push(`${entry.dir}: ${errorMessage(error)}`);
    return;
  }

  const file = skillFileFor(entry);
  const exists = await file.exists();
  if (exists && (await file.text()) === content) {
    results.unchanged.push(entry.dir);
    return;
  }
  if (!dryRun) await Bun.write(file, content);
  else projectedSkills.set(entry.dir, content);
  results[exists ? "updated" : "created"].push(entry.dir);
}

const queue = [...entries];
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    for (let entry = queue.shift(); entry; entry = queue.shift()) await syncEntry(entry);
  }),
);

for (const [name, paths] of pathsByName) {
  if (paths.length > 1) {
    warnings.push(`duplicate skill name "${name}": ${paths.join(", ")} (add NAME_OVERRIDES entries keyed by docs path)`);
  }
}

const expected = new Set(entries.map((entry) => entry.dir));
const stale = (await readdir(SKILLS_DIR, { withFileTypes: true }))
  .filter((dirent) => dirent.isDirectory() && !expected.has(dirent.name))
  .map((dirent) => dirent.name)
  .sort();

// Prefer the `trash` CLI so pruned skills stay recoverable outside git too.
async function removeSkillDir(dir: string) {
  const path = `${SKILLS_DIR}/${dir}`;
  const trash = Bun.which("trash");
  if (trash) {
    const exitCode = await Bun.spawn([trash, path]).exited;
    if (exitCode === 0) return;
  }
  await rm(path, { recursive: true });
}

const pruneRefused = args.prune && stale.length > entries.length * MAX_PRUNE_FRACTION;
if (pruneRefused) {
  warnings.push(
    `stale directories (${stale.length}) exceed ${MAX_PRUNE_FRACTION * 100}% of pages; refusing to prune (check LLMS_ENTRY_RE)`,
  );
}
const pruned = args.prune && !pruneRefused && !dryRun;
if (pruned) for (const dir of stale) await removeSkillDir(dir);

for (const list of Object.values(results)) list.sort();
const succeeded = results.failed.length === 0 && !pruneRefused;
const plugins = succeeded ? await syncPlugins({
  dryRun,
  ...(dryRun ? { projection: { updated: projectedSkills, removed: args.prune ? stale : [] } } : {}),
}) : undefined;
const report = { dryRun, guidesSource: guidesPage.source, ...results, stale, pruned, warnings, plugins };
await mkdir(CACHE_DIR, { recursive: true });
await Bun.write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

const verb = dryRun ? "would be " : "";
console.log(
  `skills: ${results.created.length} ${verb}created · ${results.updated.length} ${verb}updated · ${results.unchanged.length} unchanged · ${results.failed.length} failed`,
);
if (results.created.length > 0) console.log(`created:\n  ${results.created.join("\n  ")}`);
if (stale.length > 0) {
  const action = pruned
    ? "pruned"
    : args.prune && !pruneRefused
      ? "would be pruned"
      : "stale (not in llms.txt; rerun with --prune to delete)";
  console.log(`${action}:\n  ${stale.join("\n  ")}`);
}
if (warnings.length > 0) console.warn(`warnings:\n  ${warnings.join("\n  ")}`);
if (results.failed.length > 0) console.error(`failed:\n  ${results.failed.join("\n  ")}`);
console.log(`report: ${REPORT_PATH}`);

process.exitCode = succeeded ? 0 : 1;
if (plugins) {
  console.log(`plugins: Claude + Codex ${plugins.version} · ${plugins.changed.length} files ${dryRun ? "would change" : "changed"}`);
}
