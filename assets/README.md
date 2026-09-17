# Bun brand assets

These unmodified assets come from [Bun's official press kit](https://bun.com/press-kit), downloaded on 2026-09-14 from <https://bun.com/presskit.zip>:

- `bun-icon.svg`: `icon.svg`, the upstream icon designed for small sizes.
- `bun-logo.png`: `logo@4x.png`, the upstream transparent logo. The same artwork is used on light and dark backgrounds.

Bun's brand guidance asks users not to stretch or recolor the artwork. The Bun team owns these marks; the repository's MIT license does not grant ownership of them. This community plugin is maintained by Brian Roach and is not an official Bun, Anthropic, or OpenAI plugin.

## README cover

`bun-skills-banner.png` is a 2172 x 724 raster cover generated on 2026-09-16 with Codex's built-in image-generation tool. It uses `bun-logo.png` as a visual reference; unlike the two plugin icon files above, the cover is generated artwork, not an unmodified press-kit asset. It is documentation-only, not a product screenshot, official endorsement, or manifest icon. No separate API/CLI image-generation service was used.

Final generation prompt:

```text
Use case: compositing
Asset type: wide GitHub README cover banner for the open-source bun-skills repository.
Input image 1: supporting insert, the official Bun logo. Place it into this new banner without recoloring, stretching, or restyling its artwork; preserve its cream body, pink cheeks, black features, white edge and proportions.
Primary request: polished editorial developer-tool cover titled "Bun Skills", showing that Bun documentation powers Claude Code and Codex.
Composition: very wide landscape, roughly 3:1, full-bleed flat charcoal #14151A background; clean centered composition combining the clearly visible logo with large warm-white title and generous breathing room. Below, smaller crisp text. Restrained Bun pink #F472B6 accent and thin mint line details suggesting connected documentation pages, never clutter. All content well inside safe margins. Refined typography with normal letter spacing and precise alignment. No cards around primary text.
Text (verbatim, each once): "Bun Skills", "Claude Code + Codex", "Runtime / Bundler / Test runner / Package manager"
Constraints: this is a community project, not an official partnership. No Claude or OpenAI logo, no endorsement seal, no invented claims, no skill counts or versions, no screenshots, no other text. No gradients, glow, or decorative orbs. Logo and text are the visual focus. Beautiful sharp raster artwork readable at README width.
```
