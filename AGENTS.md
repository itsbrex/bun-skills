# Agent Instructions

This repo converts the Bun documentation (https://bun.com/docs) into agent skills and ships them as a Claude Code plugin.

## Layout

- `skills/bun-*/SKILL.md`: generated skills, one per page in https://bun.com/docs/llms.txt. Never edit them by hand; `bun run sync` overwrites them.
- `scripts/sync-skills.ts`: the generator (`bun run sync`).
- `scripts/validate-skills.ts`: the validator (`bun run validate`).
- `scripts/lib/docs.ts`: llms.txt parsing, docs URL mapping, SKILL.md parsing and rendering.
- `scripts/lib/guides.ts`: reads guide categories from https://bun.com/guides and renders the `bun-guides-index` skill.
- `scripts/lib/lightpanda.ts` and `scripts/ensure-lightpanda.ts`: download and run the Lightpanda browser.
- `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`: plugin and marketplace manifests. The repo root is the plugin.
- `.claude/skills/sync-bun-skills` and `.claude/skills/validate-bun-skills`: maintainer skills for this repo. They are not part of the plugin.
- `.claude/CLAUDE.md`: imports this file for Claude Code. It stays out of the repo root because the root is the plugin root, where Claude Code's strict plugin validator rejects a CLAUDE.md.

## Commands

```sh
bun install                    # dependencies; postinstall downloads Lightpanda if missing
bun run sync --dry-run         # preview changes against the live docs
bun run sync                   # regenerate skills (add --prune to delete skills for removed pages)
bun run validate               # frontmatter, names, llms.txt coverage, manifest versions
bun run update                 # sync, then validate
bun run typecheck              # typecheck scripts/
bun run lightpanda:upgrade     # install the latest Lightpanda nightly
bun run validate:plugin        # Claude Code's validator on both manifests and skills/
```

## Rules

- Skill names (the `name` field in `SKILL.md` frontmatter) must not exceed 64 characters and must be unique.
- A skill's directory is `bun-` plus its docs path with `/` replaced by `-`. Its name is `Bun <page title>` and its description is the llms.txt description (or the title when there is none).
- Fix name collisions and over-long names with `NAME_OVERRIDES` in `scripts/sync-skills.ts` (keyed by docs path, for example `"runtime/http/cookies"`), then rerun `bun run sync`. Do not patch generated files.
- Descriptions must not contain `<` or `>`: sync rewrites `<tag>` as `{tag}` because some skill validators reject XML-like tags.
- Every field the marketplace entry repeats from `plugin.json` (version, description, author, homepage, repository, license, keywords) must match; `bun run validate` enforces it. Bump the minor version when skills are added or removed and the patch version for content refreshes.
- Run `bun run validate` and `bun run validate:plugin` before committing skill or manifest changes, and `bun run typecheck` after changing `scripts/`.
- Do not add a `CLAUDE.md` at the repo root; use `.claude/CLAUDE.md`.
- Use the Lightpanda nightly (`bun run lightpanda:upgrade`). Stable Lightpanda 0.4.0 times out loading bun.com. If Lightpanda fails, sync falls back to a plain fetch and prints a warning.
- Write scripts against Bun APIs (`Bun.file`, `Bun.spawn`, `HTMLRewriter`, `Bun.YAML`) and keep dependencies minimal.
