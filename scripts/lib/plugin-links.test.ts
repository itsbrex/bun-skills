import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { REPO_ROOT } from "./docs";
import { pluginLinks, pluginLinksHtml, pluginLinksMarkdown } from "./plugin-links";
import { loadPluginConfig } from "./plugins";

const config = await loadPluginConfig();

describe("local plugin links", () => {
  test("uses this checkout's absolute marketplace path and only supported query fields", () => {
    const root = resolve("directory with spaces & #percent%");
    const links = pluginLinks(root, config);
    const view = new URL(links.view);
    const share = new URL(links.share);
    expect(view.protocol).toBe("codex:");
    expect(view.hostname).toBe("plugins");
    expect(view.pathname).toBe(`/${config.name}`);
    expect([...view.searchParams.keys()]).toEqual(["marketplacePath"]);
    expect(view.searchParams.get("marketplacePath")).toBe(resolve(root, ".agents/plugins/marketplace.json"));
    expect(share.searchParams.get("mode")).toBe("share");
    share.searchParams.delete("mode");
    expect(share.href).toBe(view.href);
  });

  test("Claude link prefills a local marketplace command without sending it", () => {
    const root = resolve('Bun "Skills"');
    const url = new URL(pluginLinks(root, config).claude);
    expect(url.protocol).toBe("claude-cli:");
    expect(url.hostname).toBe("open");
    expect(url.searchParams.get("cwd")).toBe(root);
    expect(url.searchParams.get("q")).toBe(`/plugin marketplace add ${JSON.stringify(root)}`);
    expect([...url.searchParams.keys()]).toEqual(["cwd", "q"]);
  });

  test("renders the requested view/share handoff with no hardcoded home directory", () => {
    const markdown = pluginLinksMarkdown(REPO_ROOT, config);
    expect(markdown).toContain("To view this in the Codex app:");
    expect(markdown).toContain(`[View ${config.name}](codex://`);
    expect(markdown).toContain(`[Share ${config.name}](codex://`);
    expect(markdown).toContain("[Open Claude Code setup](claude-cli://");
  });

  test("HTML escapes paths, metadata, and URL query separators", () => {
    const html = pluginLinksHtml(resolve('<script>alert("x")</script>'), {
      ...config, interface: { ...config.interface, displayName: '<img src=x onerror="alert(1)">' },
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
    expect(html).toContain("&amp;mode=share");
    expect(html).toContain("Nothing installs or runs when this page loads.");
    expect(html).not.toContain("http-equiv=\"refresh\"");
  });

  test("CLI prints links without starting a browser", async () => {
    const child = Bun.spawn([process.execPath, resolve(REPO_ROOT, "scripts/plugin-links.ts")], {
      cwd: REPO_ROOT, stdout: "pipe", stderr: "pipe",
    });
    const stdout = await new Response(child.stdout).text();
    const stderr = await new Response(child.stderr).text();
    expect(await child.exited).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toBe(`${pluginLinksMarkdown(REPO_ROOT, config)}\n`);
    expect(stdout).not.toContain("Local link page:");
  });
});
