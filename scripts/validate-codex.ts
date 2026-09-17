#!/usr/bin/env bun
/** Read the repository marketplace through Codex's native loader without installing the plugin. */
import { strict as assert } from "node:assert";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { REPO_ROOT, errorMessage, parseSkillFile } from "./lib/docs";
import { loadPluginConfig, validatePlugins } from "./lib/plugins";

const problems = await validatePlugins();
if (problems.length) throw new Error(problems.join("\n"));
const config = await loadPluginConfig();
const codex = Bun.which("codex");
if (!codex) throw new Error("codex CLI is required for bun run validate:codex");

const child = Bun.spawn([codex, "app-server"], { cwd: REPO_ROOT, stdin: "pipe", stdout: "pipe", stderr: "ignore" });
let nextId = 0;
const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
const reader = child.stdout.getReader();
const reading = (async () => {
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        if (!line.trim()) continue;
        const message = JSON.parse(line);
        const request = pending.get(message.id);
        if (!request) continue;
        pending.delete(message.id);
        if (message.error) request.reject(new Error(message.error.message));
        else request.resolve(message.result);
      }
    }
  } catch (error) {
    for (const request of pending.values()) request.reject(new Error(errorMessage(error)));
  } finally {
    for (const request of pending.values()) request.reject(new Error("Codex app-server closed before responding"));
    pending.clear();
  }
})();

async function request(method: string, params: unknown) {
  const id = ++nextId;
  let timer: ReturnType<typeof setTimeout>;
  return await new Promise<any>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Codex ${method} timed out after 30 seconds`));
    }, 30_000);
    child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
    child.stdin.flush();
  }).finally(() => clearTimeout(timer));
}

try {
  await request("initialize", {
    clientInfo: { name: "bun-skills-validator", version: "1.0.0" },
    capabilities: { experimentalApi: true },
  });
  child.stdin.write(`${JSON.stringify({ method: "initialized" })}\n`);
  child.stdin.flush();
  const { plugin } = await request("plugin/read", {
    marketplacePath: resolve(REPO_ROOT, ".agents/plugins/marketplace.json"),
    pluginName: config.name,
  });
  assert.equal(plugin.summary.name, config.name);
  assert.equal(plugin.description, config.description);
  assert.equal(plugin.summary.interface.displayName, config.interface.displayName);
  assert.equal(plugin.summary.interface.developerName, config.author.name);
  assert.deepEqual(plugin.summary.interface.defaultPrompt, config.interface.defaultPrompt);
  for (const field of ["composerIcon", "logo", "logoDark"] as const) {
    assert.equal(plugin.summary.interface[field], resolve(REPO_ROOT, config.interface[field]));
  }
  const dirs = (await readdir(resolve(REPO_ROOT, "skills"), { withFileTypes: true })).filter((dir) => dir.isDirectory());
  const expectedNames = await Promise.all(dirs.map(async (dir) => {
    const name = parseSkillFile(await Bun.file(resolve(REPO_ROOT, "skills", dir.name, "SKILL.md")).text()).frontmatter.name;
    return `${config.name}:${name}`;
  }));
  assert.ok(Bun.deepEquals(plugin.skills.map((skill: { name: string }) => skill.name).sort(), expectedNames.sort()),
    `Codex skill inventory differs from skills/: expected ${expectedNames.length}, loaded ${plugin.skills.length}`);
  console.log(`Codex native loader: ${plugin.summary.name} · ${plugin.skills.length} skills · metadata and 3 icon paths verified`);
} catch (error) {
  console.error(`Codex validation failed: ${errorMessage(error)}`);
  process.exitCode = 1;
} finally {
  child.stdin.end();
  child.kill();
  await child.exited;
  await reading;
}
