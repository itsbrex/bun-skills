#!/usr/bin/env bun
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { REPO_ROOT, errorMessage } from "./lib/docs";
import { pluginLinksHtml, pluginLinksMarkdown } from "./lib/plugin-links";
import { loadPluginConfig, validatePlugins } from "./lib/plugins";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    html: { type: "boolean", default: false },
    open: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help) {
  console.log("Usage: bun run plugin:links [--html] [--open]\nPrint local app links. --html saves .cache/plugin-links.html; --open also opens that page.\nDoes not install, register a marketplace, or publish a plugin.");
  process.exit(0);
}

try {
  const problems = await validatePlugins();
  if (problems.length) throw new Error(problems.join("\n"));
  const config = await loadPluginConfig();
  console.log(pluginLinksMarkdown(REPO_ROOT, config));
  if (values.html || values.open) {
    const output = resolve(REPO_ROOT, ".cache/plugin-links.html");
    await mkdir(resolve(REPO_ROOT, ".cache"), { recursive: true });
    await Bun.write(output, pluginLinksHtml(REPO_ROOT, config));
    console.log(`Local link page: ${output}`);
    if (values.open) {
      const url = pathToFileURL(output).href;
      const command = process.platform === "darwin" ? ["open", url]
        : process.platform === "win32" ? ["rundll32.exe", "url.dll,FileProtocolHandler", url]
          : ["xdg-open", url];
      const child = Bun.spawn(command, { stdout: "inherit", stderr: "inherit" });
      if (await child.exited !== 0) throw new Error(`Could not open the link page; open ${output} in your browser`);
    }
  }
} catch (error) {
  console.error(`error: ${errorMessage(error)}`);
  process.exitCode = 1;
}
