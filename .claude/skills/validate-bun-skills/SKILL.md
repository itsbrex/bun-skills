---
name: validate-bun-skills
description: This skill should be used when the user asks to "validate the Bun skills", "run the skill validator", "verify skill frontmatter", "check the plugin manifest", "lint skills before committing", or "make sure the plugin is valid" in the bun-skills repository, or after running `bun run sync`. Runs `bun run validate` and `bun run validate:plugin`, reports problems, and fixes them at their source, asking first when the user only asked to check.
argument-hint: "[--offline]"
metadata:
  internal: true
---

# Validate Bun skills

Check that `skills/` and the plugin manifests are correct before committing or publishing.

## Checks

`bun run validate` runs `scripts/validate-skills.ts`, which checks:

- Every `skills/*` directory is named `bun-<kebab-case>` and contains `SKILL.md`.
- Each file is exactly `---`, a YAML mapping, `---`, a blank line, then the body.
- Frontmatter has a `name` (unique, 64 characters or fewer) and a `description` (1024 characters or fewer, without `<` or `>`).
- The body is markdown that starts with a heading, not an HTML error page.
- `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` parse, the marketplace lists a plugin with the same `name`, and every field that entry repeats from `plugin.json` (version, description, author, homepage, repository, license, keywords) matches.
- Coverage: `skills/` has exactly one directory per page in https://bun.com/docs/llms.txt. `--offline` skips this network check.

`bun run validate:plugin` runs Claude Code's validator on the marketplace and plugin manifests (with `--strict`) and on the `skills/` directory.

## Steps

1. Run `bun run validate $ARGUMENTS`. If the output contains `coverage check failed`, rerun with `--offline` and report coverage as skipped.
2. Run `bun run validate:plugin`. Errors are blocking; report every warning.
3. Run `bun run typecheck` when anything under `scripts/` changed.
4. If the user only asked to check or validate, report the problems and ask before running sync, pruning, or editing `scripts/`. Otherwise fix each problem with the table below and rerun the failing command after each fix. If a problem survives one fix attempt, stop and report it.

## Fixing problems

| Problem | Fix |
| --- | --- |
| `missing skill for llms.txt page: bun-... (run bun run sync)` | Follow the `sync-bun-skills` skill. |
| `stale skill not in llms.txt: bun-... (run bun run sync --prune)` | Follow the `sync-bun-skills` skill, including its stale-directory check before `--prune`. |
| `bun-...: name "..." duplicates bun-...` or `bun-...: name is N chars (max 64)` | Add a `NAME_OVERRIDES` entry in `scripts/sync-skills.ts`, keyed by the page's docs path (for example `"runtime/http/cookies": "Bun HTTP Cookies"`), then follow `sync-bun-skills`. |
| `bun-...: missing name` or `bun-...: missing description` | Follow `sync-bun-skills` to regenerate. If it persists, inspect `renderSkillFile` in `scripts/lib/docs.ts`. |
| ``bun-...: expected `---` frontmatter, a blank line, then the body``, `bun-...: frontmatter is not a YAML mapping`, or a YAML parse error | Regenerate with `sync-bun-skills`. If it persists, fix `yamlScalar` and `needsQuoting` in `scripts/lib/docs.ts`. |
| `bun-...: description is N chars (max 1024)` | Regenerate with `sync-bun-skills`; sync truncates long descriptions. |
| `bun-...: description contains < or >` | Sync rewrites `<tag>` pairs as `{tag}`. For an unpaired `<` or `>`, extend `descriptionFor` in `scripts/sync-skills.ts`, then follow `sync-bun-skills`. |
| `bun-...: body is an HTML page, not markdown` | The export URL is wrong. Fix `markdownUrlFor` in `scripts/lib/docs.ts`, then follow `sync-bun-skills`. |
| `bun-...: body does not start with a markdown heading` | Open the page's markdown export. If Bun changed the export format on purpose, update the check in `scripts/validate-skills.ts`. Otherwise list it for the user as an upstream docs issue and leave the file as generated. |
| `bun-...: missing SKILL.md` | If the path is in llms.txt, follow `sync-bun-skills`. Otherwise move the directory out with `trash`. |
| `bun-...: directory name is not bun-<kebab-case>` | If it matches an llms.txt path, normalize names in `skillDirFor` (`scripts/lib/docs.ts`) and follow `sync-bun-skills` with `--prune`. Otherwise move it out with `trash`. |
| `marketplace.json does not list plugin "..."` | Make `plugins[].name` in `.claude-plugin/marketplace.json` match `name` in `.claude-plugin/plugin.json`. |
| `marketplace.json <field> does not match plugin.json` | Make that field in the `plugins[]` entry of `.claude-plugin/marketplace.json` identical to `.claude-plugin/plugin.json`. For `version`, set both to the intended release version. |
| `.claude-plugin manifests: ...` | A manifest is missing or is invalid JSON. Fix the file named in the error. |

Never fix a problem by editing a generated `skills/bun-*/SKILL.md` by hand; the next sync reverts it.

## Report back

State pass or fail for `bun run validate` (noting whether coverage ran), `bun run validate:plugin` (with every warning), and `bun run typecheck` if run. Include the problem count and every fix applied.
