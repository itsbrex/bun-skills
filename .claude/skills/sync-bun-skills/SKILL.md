---
name: sync-bun-skills
description: This skill should be used when the user asks to "update the Bun skills", "sync skills with bun.com", "refresh the Bun docs skills", "pull the latest Bun guides", "regenerate skills from llms.txt", or "check for new Bun docs pages" in the bun-skills repository. Runs the repo sync pipeline (bun.com/docs/llms.txt markdown exports plus a Lightpanda render of bun.com/guides), resolves warnings, validates, and commits the result.
argument-hint: "[--dry-run] [--prune] [--no-browser]"
---

# Sync Bun skills

Regenerate `skills/bun-*/SKILL.md` from the live Bun docs, then validate and commit. Never hand-edit files under `skills/`; the next sync overwrites them. Change the generator in `scripts/` instead.

## How the pipeline works

`bun run sync` runs `scripts/sync-skills.ts`:

1. Fetch https://bun.com/docs/llms.txt. Each `https://bun.com/docs/<path>.md` entry becomes `skills/bun-<path with / replaced by ->/SKILL.md`, with frontmatter `name: Bun <title>` and `description: <llms.txt description, else title>`, followed by the page's markdown export.
2. Fetch section landing pages (`<section>/index` in llms.txt) from `<section>.md`, because `<section>/index.md` returns 404.
3. Generate `bun-guides-index` instead of fetching it (the live page is a `<GuidesList />` JSX stub). Category headings come from https://bun.com/guides rendered by the bundled Lightpanda browser (`scripts/lib/lightpanda.ts`). If Lightpanda fails, the script reads the page with a plain fetch, and if that fails it titles categories from guide paths.
4. Write only files whose content changed. Name collisions and long names resolve through `NAME_OVERRIDES` in `scripts/sync-skills.ts`.
5. Write a JSON report to `.cache/sync-report.json` (`created`, `updated`, `unchanged`, `failed`, `stale`, `warnings`, `guidesSource`).

Shared helpers live in `scripts/lib/docs.ts` (llms.txt parsing, URL mapping, SKILL.md rendering) and `scripts/lib/guides.ts` (guides page parsing).

## Steps

1. Check the tree with `git status --short`. If unrelated uncommitted changes exist, stop and ask before continuing.
2. Run `bun install`. The postinstall step downloads the Lightpanda binary when missing.
3. Preview with `bun run sync --dry-run`. Read the printed summary and `.cache/sync-report.json`. Confirm `guidesSource` is `lightpanda`.
4. Apply with `bun run sync`. For each directory listed as stale, confirm the page left the docs (`curl -sI https://bun.com/docs/<path>.md` returns 404 and the path is absent from llms.txt), then run `bun run sync --prune`.
5. Resolve every warning using the table below, then rerun `bun run sync` until warnings are gone or explained.
6. Run `bun run validate` and require `problems: 0`. Follow the `validate-bun-skills` skill to fix failures.
7. Review `git status --short` and `git diff --stat`. Open one created skill and one updated skill to spot-check the content.
8. Update skill counts in `README.md` when skills were added or removed.
9. Bump `version` in `.claude-plugin/plugin.json` and the matching plugin entry in `.claude-plugin/marketplace.json`: minor for added or removed skills, patch for content-only refreshes.
10. Commit in logical groups that match the repo history: removed skills, new skills, guides index, refreshed skills, then scripts, docs, and the version bump.

## Warnings and failures

| Output | Action |
| --- | --- |
| `Lightpanda render failed (...); fell back to plain fetch` | Output is still correct. Run `bun run lightpanda:upgrade` and rerun. Keep the nightly build: stable Lightpanda 0.4.0 times out loading bun.com. |
| `duplicate skill name "..."` | Add `NAME_OVERRIDES` entries with section-qualified names (for example `Bun HTTP Cookies`), then rerun. |
| `"..." is over 64 chars, truncated to "..."` | Add a readable `NAME_OVERRIDES` entry of 64 characters or fewer. |
| `guides on https://bun.com/guides missing from llms.txt` | The guide has no listed markdown export, so no skill exists for it. Mention it in the summary; no code change. |
| `guide category guides/<x> is not on https://bun.com/guides` | A new category appeared in llms.txt only. Check its heading in `bun-guides-index` reads well. |
| `failed: bun-...: GET ... failed: HTTP 404` | The markdown export moved. Compare the page URL with `markdownUrlFor` in `scripts/lib/docs.ts` and extend the mapping. |
| `no pages parsed from https://bun.com/docs/llms.txt` | The llms.txt format changed. Update `LLMS_ENTRY_RE` in `scripts/lib/docs.ts`. |

## Flags

| Flag | Effect |
| --- | --- |
| `--dry-run` | Report changes without writing files |
| `--prune` | Delete stale skill directories (uses the `trash` CLI when installed) |
| `--no-browser` | Skip Lightpanda and read the guides page with a plain fetch |
| `--concurrency N` | Parallel downloads, default 12 |

`bun run update` runs sync and validate in sequence without flags.

## Report back

Summarize: counts of created, updated, unchanged, failed, and pruned skills; names of new and removed skills; the guides source; any remaining warnings; and the commits created.
