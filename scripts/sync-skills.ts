#!/usr/bin/env bun
/**
 * Regenerate skills/<dir>/SKILL.md from the Bun docs.
 *
 * Pages come from https://bun.com/docs/llms.txt and each page's markdown export. The guides index
 * skill is built from the categories on https://bun.com/guides, rendered with the bundled Lightpanda
 * browser (falling back to a plain fetch). Existing files are rewritten only when content changed.
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
  readSkillName,
  renderSkillFile,
} from "./lib/docs";
import { loadGuidesPage, renderGuidesIndexBody } from "./lib/guides";

// Pages whose `Bun <title>` name collides with another page's.
const NAME_OVERRIDES: Record<string, string> = {
  "runtime/http/cookies": "Bun HTTP Cookies",
  "runtime/plugins": "Bun Runtime Plugins",
};

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

  --dry-run         Report what would change without writing files
  --prune           Delete skill directories whose page is no longer in llms.txt
  --no-browser      Skip Lightpanda and read the guides page with a plain fetch
  --concurrency N   Parallel page downloads (default 12)`);
  process.exit(0);
}

const dryRun = args["dry-run"];
const concurrency = Math.max(1, Number.parseInt(args.concurrency, 10) || 12);
const warnings: string[] = [];

const entries = await loadDocIndex();
const guidesPage = await loadGuidesPage({ useBrowser: !args["no-browser"] });
warnings.push(...guidesPage.warnings);
console.log(
  `llms.txt: ${entries.length} pages · guides page: ${guidesPage.categories.length} categories (${guidesPage.source})`,
);

async function bodyFor(entry: DocEntry): Promise<string> {
  if (entry.path === "guides/index") return renderGuidesIndexBody(entry, entries, guidesPage, warnings);
  const url = markdownUrlFor(entry.path);
  const markdown = await fetchText(url, { accept: "text/markdown" });
  if (/^\s*<(!doctype|html)/i.test(markdown)) throw new Error(`${url} returned HTML, not markdown`);
  if (markdown.trim() === "") throw new Error(`${url} returned an empty body`);
  return markdown;
}

async function nameFor(entry: DocEntry): Promise<string> {
  const wanted = NAME_OVERRIDES[entry.path] ?? `Bun ${entry.title}`;
  if (wanted.length <= MAX_SKILL_NAME_LENGTH) return wanted;
  const previous = await readSkillName(entry.dir);
  if (previous && previous.length <= MAX_SKILL_NAME_LENGTH) return previous;
  const cut = wanted.slice(0, MAX_SKILL_NAME_LENGTH);
  const truncated = cut.slice(0, cut.lastIndexOf(" ")).trim();
  warnings.push(`${entry.dir}: "${wanted}" is over ${MAX_SKILL_NAME_LENGTH} chars, truncated to "${truncated}"`);
  return truncated;
}

type Outcome = "created" | "updated" | "unchanged" | "failed";
const results: Record<Outcome, string[]> = { created: [], updated: [], unchanged: [], failed: [] };
const names = new Map<string, string[]>();

async function syncEntry(entry: DocEntry) {
  let content: string;
  try {
    const [name, body] = await Promise.all([nameFor(entry), bodyFor(entry)]);
    names.set(name, [...(names.get(name) ?? []), entry.dir]);
    if (entry.description.length > MAX_DESCRIPTION_LENGTH) {
      warnings.push(`${entry.dir}: description is over ${MAX_DESCRIPTION_LENGTH} chars`);
    }
    content = renderSkillFile({ name, description: entry.description, body });
  } catch (error) {
    results.failed.push(`${entry.dir}: ${errorMessage(error)}`);
    return;
  }

  const file = Bun.file(`${SKILLS_DIR}/${entry.dir}/SKILL.md`);
  const exists = await file.exists();
  if (exists && (await file.text()) === content) {
    results.unchanged.push(entry.dir);
    return;
  }
  if (!dryRun) await Bun.write(file, content);
  results[exists ? "updated" : "created"].push(entry.dir);
}

const queue = [...entries];
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    for (let entry = queue.shift(); entry; entry = queue.shift()) await syncEntry(entry);
  }),
);

for (const [name, dirs] of names) {
  if (dirs.length > 1) warnings.push(`duplicate skill name "${name}": ${dirs.join(", ")} (add NAME_OVERRIDES entries)`);
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

if (args.prune && !dryRun) for (const dir of stale) await removeSkillDir(dir);

for (const list of Object.values(results)) list.sort();
const report = { dryRun, guidesSource: guidesPage.source, ...results, stale, pruned: args.prune && !dryRun, warnings };
await mkdir(CACHE_DIR, { recursive: true });
await Bun.write(`${CACHE_DIR}/sync-report.json`, `${JSON.stringify(report, null, 2)}\n`);

const verb = dryRun ? "would be " : "";
console.log(
  `skills: ${results.created.length} ${verb}created · ${results.updated.length} ${verb}updated · ${results.unchanged.length} unchanged · ${results.failed.length} failed`,
);
if (results.created.length > 0) console.log(`created:\n  ${results.created.join("\n  ")}`);
if (stale.length > 0) {
  const action = args.prune ? (dryRun ? "would be pruned" : "pruned") : "stale (rerun with --prune to delete)";
  console.log(`${action}:\n  ${stale.join("\n  ")}`);
}
if (warnings.length > 0) console.warn(`warnings:\n  ${warnings.join("\n  ")}`);
if (results.failed.length > 0) console.error(`failed:\n  ${results.failed.join("\n  ")}`);
console.log(`report: ${CACHE_DIR}/sync-report.json`);

process.exitCode = results.failed.length > 0 ? 1 : 0;
