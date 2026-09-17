import { resolve } from "node:path";
import type { PluginConfig } from "./plugins";

export function pluginLinks(root: string, config: PluginConfig) {
  const view = new URL(`codex://plugins/${encodeURIComponent(config.name)}`);
  view.searchParams.set("marketplacePath", resolve(root, ".agents/plugins/marketplace.json"));
  const share = new URL(view);
  share.searchParams.set("mode", "share");
  const claude = new URL("claude-cli://open");
  claude.searchParams.set("cwd", resolve(root));
  claude.searchParams.set("q", `/plugin marketplace add ${JSON.stringify(resolve(root))}`);
  return { view: view.href, share: share.href, claude: claude.href };
}

export function pluginLinksMarkdown(root: string, config: PluginConfig) {
  const links = pluginLinks(root, config);
  return `To view this in the Codex app:
[View ${config.name}](${links.view}) · [Share ${config.name}](${links.share})

[Open Claude Code setup](${links.claude})

Codex links open this checkout's plugin details or share dialog; they do not publish it.
Claude prefills the marketplace command for review. Then run /plugin install ${config.name}@${config.name}.
`;
}

export function pluginLinksHtml(root: string, config: PluginConfig) {
  const links = pluginLinks(root, config);
  const escape = (value: string) => Bun.escapeHTML(value);
  const name = escape(config.name);
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${escape(config.interface.displayName)} plugin links</title>
<style>
  body { font: 16px/1.6 system-ui, sans-serif; max-width: 48rem; margin: 3rem auto; padding: 0 1rem; }
  h1 { font-size: 2rem; line-height: 1.2; } a { text-underline-offset: .2em; }
  pre { padding: 1rem; background: light-dark(#f3f4f6, #202124); overflow-x: auto; }
  code { overflow-wrap: anywhere; } p { overflow-wrap: anywhere; }
</style>
<h1>${escape(config.interface.displayName)}</h1>
<p>Local checkout: <code>${escape(resolve(root))}</code></p>
<h2>Codex</h2>
<p>Register this checkout from its root before opening the links:</p>
<pre><code>codex plugin marketplace add .
codex plugin add ${name}@${name}</code></pre>
<p>To view this in the Codex app:<br>
<a href="${escape(links.view)}">View ${name}</a> &middot; <a href="${escape(links.share)}">Share ${name}</a></p>
<p>View opens plugin details. Share opens sharing controls; it does not publish automatically. Start a new task after installation.</p>
<h2>Claude Code</h2>
<p><a href="${escape(links.claude)}">Open Claude Code setup</a></p>
<p>Review the prefilled marketplace command and submit it. Then install:</p>
<pre><code>/plugin install ${name}@${name}</code></pre>
<p>These app links require the corresponding app and URL handler. Nothing installs or runs when this page loads.</p>
<p><a href="${escape(config.repository)}">Repository and portable installation instructions</a></p>
</html>
`;
}
