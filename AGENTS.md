# Agent Instructions

This repo converts the Bun documentation (https://bun.com/docs) into agent skills and ships them as Claude Code and Codex plugins sharing one skill directory and release version.

## Layout

- `skills/bun-*/SKILL.md`: generated skills, one per page in https://bun.com/docs/llms.txt. Never edit them by hand; `bun run sync` overwrites them.
- `scripts/sync-skills.ts`: the generator (`bun run sync`).
- `scripts/validate-skills.ts`: the validator (`bun run validate`).
- `scripts/lib/docs.ts`: llms.txt parsing, docs URL mapping, SKILL.md parsing and rendering.
- `scripts/lib/guides.ts`: reads guide categories from https://bun.com/guides and renders the `bun-guides-index` skill.
- `scripts/lib/lightpanda.ts` and `scripts/ensure-lightpanda.ts`: download and run the Lightpanda browser.
- `plugin.config.json`: shared plugin metadata; edit this source instead of generated manifests.
- `scripts/lib/plugins.ts` and `scripts/sync-plugins.ts`: generate both ecosystems and calculate automatic release versions.
- `.plugin-sync.json`: committed release fingerprints. Do not delete it as a cache; it detects content changes across failed syncs and retries.
- `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json`, and `.agents/plugins/marketplace.json`: generated manifests and catalogs. The repo root is both plugins; both load `skills/`.
- `assets/`: original Bun branding and provenance; Codex icon paths must resolve inside the plugin.
- `docs/installation.md`: install, local app-link, sharing, and troubleshooting instructions. The README also contains the maintenance and release reference.
- `scripts/plugin-links.ts` and `scripts/lib/plugin-links.ts`: generate local Codex View/Share and Claude setup links; HTML output stays in ignored `.cache/`.
- `bunfig.toml`: hoisted install layout required by the locked Bun type declarations' transitive `undici-types` imports.
- `.claude/skills/sync-bun-skills` and `.claude/skills/validate-bun-skills`: maintainer skills for this repo. They are not part of the plugin, and `metadata.internal: true` hides them from `npx skills add`.
- `.claude/CLAUDE.md`: imports this file for Claude Code. It stays out of the repo root because the root is the plugin root, where Claude Code's strict plugin validator rejects a CLAUDE.md.

## Commands

```sh
bun install                    # dependencies; postinstall generates both plugins and installs Lightpanda
bun run sync --dry-run         # preview changes against the live docs
bun run sync                   # regenerate skills and both plugins (add --prune for removed pages)
bun run sync:plugins            # regenerate only plugin metadata; --check fails on drift without writing
bun run plugin:links --open     # generate and open local app links; does not install or publish
bun run validate               # frontmatter, names, llms.txt coverage, both plugins and assets
bun run update                 # sync, then validate
bun run typecheck              # typecheck scripts/
bun run lightpanda:upgrade     # install the latest Lightpanda nightly
bun run validate:plugin        # shared checks, Claude native validation, Codex native loading
bun test scripts               # release/version/metadata/asset regression tests
```

## Rules

- Skill names (the `name` field in `SKILL.md` frontmatter) must not exceed 64 characters and must be unique.
- A skill's directory is `bun-` plus its docs path with `/` replaced by `-`. Its name is `Bun <page title>` and its description is the llms.txt description (or the title when there is none).
- Fix name collisions and over-long names with `NAME_OVERRIDES` in `scripts/sync-skills.ts` (keyed by docs path, for example `"runtime/http/cookies"`), then rerun `bun run sync`. Do not patch generated files.
- Descriptions must not contain `<` or `>`: sync rewrites `<tag>` as `{tag}` because some skill validators reject XML-like tags.
- Never hand-edit generated manifests or `.plugin-sync.json`. Update `plugin.config.json`, then run `bun run sync:plugins`. The generator bumps minor versions for skill membership changes and patch versions for content, metadata, or asset changes. Explicit higher versions in the config take precedence; downgrades fail. Commit the config, state, manifests, and content together.
- Keep only supported metadata with real values. Claude has no documented plugin icon field; use Codex `interface` for icons. Do not invent contacts, privacy/terms URLs, or screenshots. Both native validators must accept the result.
- Never commit machine-specific app links. Generate them with `bun run plugin:links`; keep GitHub-safe README links pointed at the installation guide. A Codex Share link opens a dialog, not a hosted publication.
- Run `bun run validate` and `bun run validate:plugin` before committing skill or manifest changes, and `bun run typecheck` after changing `scripts/`.
- Do not add a `CLAUDE.md` at the repo root; use `.claude/CLAUDE.md`.
- Use the Lightpanda nightly (`bun run lightpanda:upgrade`). Stable Lightpanda 0.4.0 times out loading bun.com. If Lightpanda fails, sync falls back to a plain fetch and prints a warning.
- Write scripts against Bun APIs (`Bun.file`, `Bun.spawn`, `HTMLRewriter`, `Bun.YAML`) and keep dependencies minimal.
