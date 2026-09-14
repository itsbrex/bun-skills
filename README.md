# bun-skills

[Bun](https://bun.com) documentation converted to AI agent skills (Claude Code, Codex, Copilot, and other agents that read `SKILL.md`), packaged as a Claude Code plugin.

- **319 skills**, one per page in [bun.com/docs/llms.txt](https://bun.com/docs/llms.txt): runtime, bundler, test runner, package manager, and all 190 guides from [bun.com/guides](https://bun.com/guides).
- **`bun-guides-index`** lists every guide by category, so an agent can find the right guide skill.
- **Kept current with one command**: `bun run update` regenerates every skill from the live docs and validates the result.

## Install

### Claude Code plugin

```sh
/plugin marketplace add itsbrex/bun-skills
/plugin install bun-skills@bun-skills
```

Or from a terminal:

```sh
claude plugin marketplace add itsbrex/bun-skills
claude plugin install bun-skills@bun-skills
```

The skill listing adds about 11.7k tokens to every session (see `claude plugin details bun-skills`). Claude Code loads a skill's full page only when the skill is used.

### Other agents

```sh
npx skills add itsbrex/bun-skills
```

## Skills

Each skill directory is `bun-` plus the docs path with `/` replaced by `-`:

| Docs page | Skill |
| --- | --- |
| `runtime/http/server` | `bun-runtime-http-server` |
| `bundler/css` | `bun-bundler-css` |
| `test/parallel` | `bun-test-parallel` |
| `guides/http/sse` | `bun-guides-http-sse` |

Skill names follow `Bun <page title>` (for example `Bun WebView`) and descriptions come from llms.txt.

## Updating the skills

Requirements: [Bun](https://bun.com) 1.3 or later. The Lightpanda browser runs on macOS and Linux; on other platforms sync reads the guides page with a plain fetch instead.

```sh
bun install              # also downloads Lightpanda if missing
bun run sync --dry-run   # preview what changed on bun.com
bun run sync             # regenerate skills (--prune deletes skills for removed pages)
bun run validate         # must report problems: 0
```

In Claude Code, open this repo and run `/sync-bun-skills` or `/validate-bun-skills`. These maintainer skills walk through the preview, warning triage, validation, version bump, and commits.

### How sync works

1. Fetch [llms.txt](https://bun.com/docs/llms.txt) and download each page's markdown export (`https://bun.com/docs/<path>.md`). Section landing pages come from `<section>.md`.
2. Render [bun.com/guides](https://bun.com/guides) with the [Lightpanda](https://lightpanda.io) browser (downloaded by `bun install` through the pinned `@lightpanda/browser` package) to read the guide categories for `bun-guides-index`. If Lightpanda fails, fall back to a plain fetch, then to titles derived from guide paths.
3. Write `SKILL.md` files whose content changed, report stale skills, and save a report to `.cache/sync-report.json`.

### Scripts

| Command | What it does |
| --- | --- |
| `bun run sync` | Regenerate skills. Flags: `--dry-run`, `--prune`, `--no-browser`, `--concurrency N` |
| `bun run validate` | Check frontmatter, name length and uniqueness, llms.txt coverage, and manifest versions. `--offline` skips coverage |
| `bun run validate:plugin` | Run Claude Code's validator on both manifests (`--strict`) and `skills/`. Requires the `claude` CLI |
| `bun run update` | `sync`, then `validate` |
| `bun run typecheck` | Typecheck `scripts/` |
| `bun run lightpanda:install` | Download Lightpanda if missing |
| `bun run lightpanda:upgrade` | Download the latest Lightpanda nightly (stable 0.4.0 times out on bun.com) |

Run `bun run validate` and `bun run validate:plugin` before publishing.

## Credits

Documentation content comes from [bun.com/docs](https://bun.com/docs) by the Bun team. Original skill conversion by Jarle Mathiesen ([jarle/bun-skills](https://github.com/jarle/bun-skills)). Repository tooling is MIT licensed.
