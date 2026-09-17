#!/usr/bin/env bun
/**
 * Validate skills/ and the plugin manifests.
 *
 * Checks every SKILL.md for parseable frontmatter, a unique name of at most 64 characters, a
 * description, and a markdown body. Unless --offline, also checks that skills/ has exactly one
 * directory per page in https://bun.com/docs/llms.txt.
 *
 * Usage: bun run validate [--offline]
 */
import { readdir } from "node:fs/promises";
import { parseArgs } from "node:util";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_SKILL_NAME_LENGTH,
  SKILLS_DIR,
  errorMessage,
  loadDocIndex,
  parseSkillFile,
} from "./lib/docs";
import { validatePlugins } from "./lib/plugins";

const { values: args } = parseArgs({
  args: Bun.argv.slice(2),
  options: { offline: { type: "boolean", default: false } },
});

const problems: string[] = [];
const dirs = (await readdir(SKILLS_DIR, { withFileTypes: true }))
  .filter((dirent) => dirent.isDirectory())
  .map((dirent) => dirent.name)
  .sort();

const names = new Map<string, string>();
for (const dir of dirs) {
  if (!/^bun-[a-z0-9]+(-[a-z0-9]+)*$/.test(dir)) problems.push(`${dir}: directory name is not bun-<kebab-case>`);
  const file = Bun.file(`${SKILLS_DIR}/${dir}/SKILL.md`);
  if (!(await file.exists())) {
    problems.push(`${dir}: missing SKILL.md`);
    continue;
  }

  let frontmatter: Record<string, unknown>;
  let body: string;
  try {
    ({ frontmatter, body } = parseSkillFile(await file.text()));
  } catch (error) {
    problems.push(`${dir}: ${errorMessage(error)}`);
    continue;
  }

  const { name, description } = frontmatter;
  if (typeof name !== "string" || name === "") {
    problems.push(`${dir}: missing name`);
  } else {
    if (name.length > MAX_SKILL_NAME_LENGTH) problems.push(`${dir}: name is ${name.length} chars (max ${MAX_SKILL_NAME_LENGTH})`);
    const other = names.get(name);
    if (other) problems.push(`${dir}: name "${name}" duplicates ${other}`);
    names.set(name, dir);
  }
  if (typeof description !== "string" || description === "") {
    problems.push(`${dir}: missing description`);
  } else {
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      problems.push(`${dir}: description is ${description.length} chars (max ${MAX_DESCRIPTION_LENGTH})`);
    }
    if (/[<>]/.test(description)) problems.push(`${dir}: description contains < or >`);
  }
  if (/^\s*<(!doctype|html)/i.test(body)) problems.push(`${dir}: body is an HTML page, not markdown`);
  else if (!body.trimStart().startsWith("#")) problems.push(`${dir}: body does not start with a markdown heading`);
}

problems.push(...await validatePlugins());

let coverage = "skipped (--offline)";
if (!args.offline) {
  try {
    const expected = new Set((await loadDocIndex()).map((entry) => entry.dir));
    const actual = new Set(dirs);
    for (const dir of expected) if (!actual.has(dir)) problems.push(`missing skill for llms.txt page: ${dir} (run bun run sync)`);
    for (const dir of actual) if (!expected.has(dir)) problems.push(`stale skill not in llms.txt: ${dir} (run bun run sync --prune)`);
    coverage = `${expected.size} pages in llms.txt`;
  } catch (error) {
    problems.push(`coverage check failed: ${errorMessage(error)} (rerun with --offline to skip it)`);
    coverage = "failed";
  }
}

console.log(`skills: ${dirs.length} · coverage: ${coverage} · problems: ${problems.length}`);
if (problems.length > 0) {
  console.error(`  ${problems.join("\n  ")}`);
  process.exitCode = 1;
}
