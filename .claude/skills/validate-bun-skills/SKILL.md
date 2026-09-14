---
name: validate-bun-skills
description: This skill should be used when the user asks to "validate the Bun skills", "check the skills", "verify skill frontmatter", "check the plugin manifest", "lint skills before committing", or "make sure the plugin is valid" in the bun-skills repository, and after every `bun run sync`. Runs the repo validator and the Claude Code plugin validator, then fixes each reported problem at its source.
argument-hint: "[--offline]"
---

# Validate Bun skills

Check that `skills/` and the plugin manifests are correct before committing or publishing.

## Checks

`bun run validate` runs `scripts/validate-skills.ts`, which checks:

- Every `skills/*` directory is named `bun-<kebab-case>` and contains `SKILL.md`.
- Frontmatter parses as YAML and has a `name` (unique, 64 characters or fewer) and a `description` (1024 characters or fewer).
- The body is markdown that starts with a heading, not an HTML error page.
- `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` parse, and the marketplace lists the plugin with the same version.
- Coverage: `skills/` has exactly one directory per page in https://bun.com/docs/llms.txt. `--offline` skips this network check.

## Steps

1. Run `bun run validate`. Use `bun run validate --offline` only when the network is unavailable, and say coverage was skipped.
2. Run `claude plugin validate .` to check the manifests and skills with Claude Code's own validator. Treat errors as blocking. Report warnings, and use `--strict` when preparing a release.
3. Run `bun run typecheck` when anything under `scripts/` changed.
4. Fix each problem with the table below, then rerun the failing command until it passes.

## Fixing problems

| Problem | Fix |
| --- | --- |
| `missing skill for llms.txt page: bun-...` | Run `bun run sync`. |
| `stale skill not in llms.txt: bun-...` | Confirm the page is gone (`curl -sI https://bun.com/docs/<path>.md` returns 404), then run `bun run sync --prune`. |
| `name "..." duplicates bun-...` | Add a `NAME_OVERRIDES` entry in `scripts/sync-skills.ts` and run `bun run sync`. |
| `name is N chars (max 64)` | Add a shorter `NAME_OVERRIDES` entry and run `bun run sync`. |
| `missing name` / `missing description` / frontmatter errors | Regenerate with `bun run sync`. If it persists, inspect `renderSkillFile` in `scripts/lib/docs.ts`. |
| `body is an HTML page, not markdown` | The markdown export URL is wrong. Fix `markdownUrlFor` in `scripts/lib/docs.ts` and run `bun run sync`. |
| `body does not start with a markdown heading` | Open the page's markdown export. If Bun changed the export format on purpose, update the check in `scripts/validate-skills.ts`; otherwise report it. |
| `marketplace.json version X does not match plugin.json version Y` | Set both versions to the intended release version. |
| `directory name is not bun-<kebab-case>` | Rename or remove the directory; only generated `bun-*` skills belong in `skills/`. |

Never fix a problem by editing a generated `skills/bun-*/SKILL.md` by hand; the next sync reverts it.

## Report back

State pass or fail for `bun run validate`, `claude plugin validate .`, and (if run) `bun run typecheck`, with the problem count and every fix applied.
