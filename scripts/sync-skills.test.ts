import { afterEach, expect, test } from "bun:test";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { parseLlmsTxt, REPO_ROOT } from "./lib/docs";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

const page = (title: string, path: string) => `- [${title}](https://bun.com/docs/${path}.md)`;

test("repeated index paths remain deduplicated; distinct directories remain separate", () => {
  const entries = parseLlmsTxt([page("One", "a/b"), page("One", "a/b"), page("Two", "a/c")].join("\n"));
  expect(entries.map(({ dir }) => dir)).toEqual(["bun-a-b", "bun-a-c"]);
});

for (const [label, index, error] of [
  ["directory collisions", [page("One", "a-b/c"), page("Two", "a/b-c")], 'duplicate skill directory "bun-a-b-c": a-b/c, a/b-c'],
  ["duplicate titles", [page("Same", "one"), page("Same", "two")], 'duplicate skill name "Bun Same": one, two'],
  ["truncated names", [page(`${"Word ".repeat(15)}One`, "one"), page(`${"Word ".repeat(15)}Two`, "two")], "duplicate skill name"],
] as const) {
  for (const dryRun of [false, true]) {
    test(`sync rejects ${label} before downloads or writes (${dryRun ? "dry run" : "write"})`, async () => {
      const root = await mkdtemp(resolve(tmpdir(), "bun-sync-test-"));
      roots.push(root);
      await cp(resolve(REPO_ROOT, "scripts"), resolve(root, "scripts"), { recursive: true });
      const protectedPaths = ["plugin.config.json", ".plugin-sync.json", ".claude-plugin/plugin.json", ".claude-plugin/marketplace.json", ".codex-plugin/plugin.json", ".agents/plugins/marketplace.json"];
      for (const path of protectedPaths) {
        await Bun.write(resolve(root, path), await Bun.file(resolve(REPO_ROOT, path)).bytes());
      }
      const skillPath = "skills/bun-one/SKILL.md";
      await Bun.write(resolve(root, skillPath), "existing skill\n");
      protectedPaths.push(skillPath);
      const before = await Promise.all(protectedPaths.map((path) => Bun.file(resolve(root, path)).text()));
      // Intercept fetch in the child: only the docs index may be requested.
      await Bun.write(resolve(root, "preload.ts"), `globalThis.fetch = (async (url) => {
        if (String(url) === "https://bun.com/docs/llms.txt") return new Response(${JSON.stringify(index.join("\n"))});
        console.error("UNEXPECTED_DOWNLOAD", String(url));
        throw new Error("Unexpected page download");
      }) as typeof fetch;`);
      const child = Bun.spawn([process.execPath, "--preload", resolve(root, "preload.ts"), resolve(root, "scripts/sync-skills.ts"), "--no-browser", "--prune", ...(dryRun ? ["--dry-run"] : [])], { cwd: root, stdout: "pipe", stderr: "pipe" });
      const [exitCode, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
      expect(exitCode).toBe(1);
      expect(stderr).toContain(error);
      expect(stderr).toContain("nothing was written");
      expect(stdout + stderr).not.toContain("UNEXPECTED_DOWNLOAD");
      expect(await Promise.all(protectedPaths.map((path) => Bun.file(resolve(root, path)).text()))).toEqual(before);
      expect(await Array.fromAsync(new Bun.Glob("skills/**/SKILL.md").scan(root))).toEqual([skillPath]);
    });
  }
}
