---
name: sync-bun-skills
description: This skill should be used when the user asks to "update the Bun skills", "sync skills with bun.com", "refresh the Bun docs skills", "pull the latest Bun guides", "regenerate skills from llms.txt", or "check for new Bun docs pages" in the bun-skills repository. Previews changes from bun.com/docs/llms.txt and a Lightpanda render of bun.com/guides, then applies, validates, and commits them; stops after the preview when the user only asks to check.
argument-hint: "[--dry-run] [--prune] [--no-browser] [--concurrency N]"
metadata:
  internal: true
---

# Sync Bun skills

Regenerate `skills/bun-*/SKILL.md` from the live Bun docs, then validate and commit. Never hand-edit files under `skills/`; the next sync overwrites them. Change the generator in `scripts/` instead.

## How the pipeline works

`bun run sync` runs `scripts/sync-skills.ts`:

1. Fetch https://bun.com/docs/llms.txt. Each `https://bun.com/docs/<path>.md` entry becomes `skills/bun-<path with / replaced by ->/SKILL.md`. The `name` comes from `NAME_OVERRIDES` (keyed by docs path, for example `"runtime/http/cookies"`), else `Bun <title>`. The `description` is the llms.txt description, else the title. The body is the page's markdown export.
2. Fetch section landing pages (`<section>/index`) from `https://bun.com/docs/<section>.md`, and `index` from `https://bun.com/docs.md` (see `markdownUrlFor` in `scripts/lib/docs.ts`).
3. Generate `bun-guides-index`. Category headings come from https://bun.com/guides rendered by the Lightpanda binary that `@lightpanda/browser` downloads to `~/.cache/lightpanda-node/lightpanda` (override with `LIGHTPANDA_EXECUTABLE_PATH`). If Lightpanda fails, the script reads the page with a plain fetch. If both fail, it keeps the existing index skill and reports it as failed.
4. Rewrite `<tag>` in descriptions as `{tag}`. Truncate names over 64 characters and descriptions over 1024 characters at a word boundary, with a warning.
5. Write only files whose content changed. Report directories absent from llms.txt as stale. `--prune` deletes them (with the `trash` CLI when installed), but refuses when stale directories exceed 10% of pages, because that signals broken llms.txt parsing.
6. After a successful sync, regenerate both plugins and marketplaces from `plugin.config.json`. `.plugin-sync.json` fingerprints all packaged skills, metadata, and referenced assets; skill membership changes bump the minor version and content changes bump the patch version. Dry runs preview the same version against downloaded content. Failed syncs keep the previous release fingerprint so retries detect partial changes.
7. Write `.cache/sync-report.json` with `dryRun`, `guidesSource`, `created`, `updated`, `unchanged`, `failed`, `stale`, `pruned`, `warnings`, and `plugins` (version, skill count, changed generated paths). The script deletes the old report first, so a missing report means the run crashed.

## Steps

Append `--no-browser` and `--concurrency N` from `$ARGUMENTS` to every `bun run sync` command below.

1. Run `git status --short`. If unrelated uncommitted changes exist, stop and ask.
2. Run `bun install`. Postinstall regenerates both plugins and downloads Lightpanda when missing. For a read-only preview, use `bun install --ignore-scripts` instead.
3. Preview with `bun run sync --dry-run`. Read the printed summary and `.cache/sync-report.json`. Confirm `guidesSource` is `lightpanda` (or `fetch` with `--no-browser`). If `$ARGUMENTS` contains `--dry-run` or the user only asked to check or preview, report the results and stop.
4. If `created`, `updated`, `stale`, `failed`, `warnings`, and `plugins.changed` are all empty, report that the skills and both plugins are current and stop. Do not bump the version or commit.
5. Resolve warnings and failures with the tables below. After changing `scripts/`, run `bun run typecheck` and repeat step 3.
6. Apply with `bun run sync`, adding `--prune` when the preview listed stale directories. Before pruning, spot-check one stale directory: search llms.txt for its last word (`curl -s https://bun.com/docs/llms.txt | grep -i '<word>'`). If the page is still listed, llms.txt parsing is broken; fix `LLMS_ENTRY_RE` and do not prune.
7. Follow the `validate-bun-skills` skill: `bun run validate` must print `problems: 0` and `bun run validate:plugin` must pass.
8. Review `git status --short` and `git diff --stat`. Open one created and one updated skill to spot-check the content.
9. Update the `**319 skills**` and `all 190 guides` counts in `README.md` when skills or guides were added or removed.
10. Verify the automatic version in `plugin.config.json`, `.plugin-sync.json`, and both generated plugin manifests. Do not bump or edit generated manifests by hand. For metadata-only changes, edit `plugin.config.json` and run `bun run sync:plugins`. Include all four generated manifests and the fingerprint file in the release commit.
11. Commit independent script or documentation changes separately when useful, but keep changed packaged skills/assets, shared config, release fingerprint, and all four generated manifests in one coherent release commit. Do not split content from its version/fingerprint update. Follow the README release checklist.

## Warnings

| Warning | Action |
| --- | --- |
| `Lightpanda render failed (...); fell back to plain fetch` | Run `bun run lightpanda:upgrade` and repeat the preview. Keep the nightly build: stable Lightpanda 0.4.0 times out loading bun.com. On platforms Lightpanda does not support, use `--no-browser`. Output is unaffected while `guidesSource` is `fetch`. |
| `Lightpanda render of https://bun.com/guides had no guide categories; fell back to plain fetch` | The page markup changed. Update `parseGuideCategories` in `scripts/lib/guides.ts` (each `<h3>` heading owns the guide links after it). |
| `no guide categories found on https://bun.com/guides; ...` or `plain fetch of https://bun.com/guides failed (...)` | `guidesSource` is `none` and `bun-guides-index` was kept unchanged. Fix `parseGuideCategories` or the network problem, then rerun. |
| `<path>: name "..." is over 64 chars, truncated to "..."; add a NAME_OVERRIDES entry` | Add a readable entry of 64 characters or fewer, keyed by the docs path shown. |
| `duplicate skill name "...": <path>, <path> (add NAME_OVERRIDES entries keyed by docs path)` | Add section-qualified names, for example `"runtime/http/cookies": "Bun HTTP Cookies"`. |
| `<path>: description is over 1024 chars, truncated` | No action needed; mention it in the summary. |
| `<path>: description contains an unpaired < or >` | `bun run validate` will fail. Extend `descriptionFor` in `scripts/sync-skills.ts` to handle the character, run `bun run typecheck`, and rerun. |
| `guides on https://bun.com/guides missing from llms.txt (no skill generated): ...` | Those guides have no listed markdown export. Mention them; no code change. |
| `guide category guides/<x> is not on https://bun.com/guides; titled from its path` | Check that the heading reads well in `bun-guides-index`; titles come from `titleFromSlug` in `scripts/lib/guides.ts`. |
| `stale directories (N) exceed 10% of pages; refusing to prune (check LLMS_ENTRY_RE)` | llms.txt parsing is likely broken. Compare llms.txt lines with `LLMS_ENTRY_RE` in `scripts/lib/docs.ts`. |

## Failures

Failed pages keep their existing `SKILL.md`, and the command exits with code 1.

| Output | Action |
| --- | --- |
| `error: GET https://bun.com/docs/llms.txt failed: ...; nothing was written` | Network problem or bun.com outage. Retry later. |
| `error: no pages parsed from https://bun.com/docs/llms.txt; ...` | The llms.txt format changed. Update `LLMS_ENTRY_RE` in `scripts/lib/docs.ts`. |
| `bun-...: GET ... failed: HTTP 404` | The export URL moved. Compare it with `markdownUrlFor` in `scripts/lib/docs.ts`. If the page also 404s in a browser, llms.txt lists a dead link; report it upstream instead. |
| `bun-...: GET ... failed: HTTP 429`, `HTTP 5xx`, or a network error | Transient after 4 attempts. Rerun with `--concurrency 4`. |
| `bun-...: ... returned HTML, not markdown` or `returned an empty body` | Check the export URL from `markdownUrlFor`. If the page is broken upstream, report it and leave the existing skill. |
| `bun-guides-index: guide categories unavailable from https://bun.com/guides; kept the existing skill` | See the `guidesSource` `none` warning above. |

## Flags

| Flag | Effect |
| --- | --- |
| `--dry-run` | Report changes without writing skill files (the report is still written) |
| `--prune` | Delete stale skill directories |
| `--no-browser` | Skip Lightpanda and read the guides page with a plain fetch |
| `--concurrency N` | Parallel downloads, default 12 |

`bun run update` forwards all sync flags and then runs validation. Validation does not run after a dry run or failed sync.

## Report back

Summarize: counts of created, updated, unchanged, failed, and pruned skills; names of new and removed skills; the guides source; remaining warnings; and the commits created.
