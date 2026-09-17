import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { REPO_ROOT } from "./docs";
import { CONFIG_PATH, STATE_PATH, loadPluginConfig, syncPlugins, validatePlugins } from "./plugins";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), "bun-plugin-test-"));
  roots.push(root);
  await mkdir(resolve(root, "assets"));
  await Bun.write(resolve(root, CONFIG_PATH), await Bun.file(resolve(REPO_ROOT, CONFIG_PATH)).bytes());
  for (const name of ["bun-icon.svg", "bun-logo.png"]) {
    await Bun.write(resolve(root, "assets", name), await Bun.file(resolve(REPO_ROOT, "assets", name)).bytes());
  }
  await addSkill(root, "bun-index");
  const config = await loadPluginConfig(root);
  config.version = "1.1.0";
  await writeJson(root, CONFIG_PATH, config);
  return root;
}

async function writeJson(root: string, path: string, value: unknown) {
  await Bun.write(resolve(root, path), `${JSON.stringify(value, null, 2)}\n`);
}

async function addSkill(root: string, dir: string) {
  await mkdir(resolve(root, "skills", dir), { recursive: true });
  await Bun.write(resolve(root, "skills", dir, "SKILL.md"), `---\nname: ${dir}\ndescription: Bun reference\n---\n\n# Bun\n\nReference content.\n`);
}

describe("shared plugin releases", () => {
  test("creates both ecosystems with one skill source and complete metadata", async () => {
    const root = await fixture();
    const result = await syncPlugins({ root });
    expect(result.version).toBe("1.1.0");
    expect(result.changed).toHaveLength(5);
    const claude = await Bun.file(resolve(root, ".claude-plugin/plugin.json")).json();
    const codex = await Bun.file(resolve(root, ".codex-plugin/plugin.json")).json();
    for (const field of ["name", "version", "description", "author", "homepage", "repository", "license", "keywords", "skills"]) {
      expect(codex[field]).toEqual(claude[field]);
    }
    expect(codex.skills).toBe("./skills/");
    expect(codex.interface.displayName).toBe(claude.displayName);
    expect(codex.interface.developerName).toBe(codex.author.name);
    expect(codex.interface.websiteURL).toBe(codex.homepage);
    const marketplace = await Bun.file(resolve(root, ".agents/plugins/marketplace.json")).json();
    expect(marketplace.plugins[0].source).toEqual({ source: "local", path: "./" });
    expect(await validatePlugins(root)).toEqual([]);
    expect((await syncPlugins({ root })).changed).toEqual([]);
  });

  test("content refresh bumps both plugins once; dry runs never write", async () => {
    const root = await fixture();
    await syncPlugins({ root });
    const state = await Bun.file(resolve(root, STATE_PATH)).text();
    await Bun.write(resolve(root, "skills/bun-index/SKILL.md"), "---\nname: Bun Index\ndescription: Bun reference\n---\n\n# Updated Bun\n");
    expect((await syncPlugins({ root, dryRun: true })).version).toBe("1.1.1");
    expect((await loadPluginConfig(root)).version).toBe("1.1.0");
    expect(await Bun.file(resolve(root, STATE_PATH)).text()).toBe(state);
    expect((await validatePlugins(root)).length).toBeGreaterThan(0);
    expect((await syncPlugins({ root })).version).toBe("1.1.1");
    expect((await syncPlugins({ root })).changed).toEqual([]);
  });

  test("adding and removing skills bump the minor version", async () => {
    const root = await fixture();
    await syncPlugins({ root });
    await addSkill(root, "bun-test");
    expect((await syncPlugins({ root })).version).toBe("1.2.0");
    await rm(resolve(root, "skills/bun-test"), { recursive: true });
    expect((await syncPlugins({ root })).version).toBe("1.3.0");
  });

  test("sync previews account for downloaded skill changes without writing them", async () => {
    const root = await fixture();
    await syncPlugins({ root });
    const body = "---\nname: Bun Test\ndescription: Test documentation\n---\n\n# Bun Test\n";
    const preview = await syncPlugins({ root, dryRun: true, projection: { updated: new Map([["bun-test", body]]), removed: [] } });
    expect(preview.version).toBe("1.2.0");
    expect(preview.skillCount).toBe(2);
    expect(await Bun.file(resolve(root, "skills/bun-test/SKILL.md")).exists()).toBe(false);
    expect((await loadPluginConfig(root)).version).toBe("1.1.0");
    await mkdir(resolve(root, "skills/bun-test"));
    await Bun.write(resolve(root, "skills/bun-test/SKILL.md"), body);
    expect((await syncPlugins({ root })).version).toBe(preview.version);
    expect((await syncPlugins({ root, dryRun: true, projection: { updated: new Map(), removed: ["bun-test"] } })).version).toBe("1.3.0");
  });

  test("metadata and bundled asset changes bump the patch version", async () => {
    const root = await fixture();
    await syncPlugins({ root });
    const config = await loadPluginConfig(root);
    config.interface.shortDescription = "Updated Bun documentation";
    await writeJson(root, CONFIG_PATH, config);
    expect((await syncPlugins({ root })).version).toBe("1.1.1");
    const icon = Bun.file(resolve(root, "assets/bun-icon.svg"));
    await Bun.write(icon, `${await icon.text()}\n`);
    expect((await syncPlugins({ root })).version).toBe("1.1.2");
  });

  test("missing or modified generated manifests are repaired without a release bump", async () => {
    const root = await fixture();
    await syncPlugins({ root });
    await rm(resolve(root, ".codex-plugin/plugin.json"));
    await Bun.write(resolve(root, ".claude-plugin/plugin.json"), "invalid JSON");
    expect(await validatePlugins(root)).toHaveLength(2);
    const result = await syncPlugins({ root });
    expect(result.version).toBe("1.1.0");
    expect(result.changed).toHaveLength(2);
    expect(await validatePlugins(root)).toEqual([]);
  });

  test("retries an interrupted release without bumping twice", async () => {
    const root = await fixture();
    await syncPlugins({ root });
    const config = await loadPluginConfig(root);
    config.version = "1.1.1";
    config.description = "Updated Bun documentation skills";
    await writeJson(root, CONFIG_PATH, config);
    await Bun.write(resolve(root, ".codex-plugin/plugin.json"), "interrupted");
    expect((await syncPlugins({ root })).version).toBe("1.1.1");
    expect((await syncPlugins({ root })).changed).toEqual([]);
  });

  test("explicit major releases are respected and downgrades fail before writes", async () => {
    const root = await fixture();
    await syncPlugins({ root });
    const config = await loadPluginConfig(root);
    config.version = "2.0.0";
    await writeJson(root, CONFIG_PATH, config);
    expect((await syncPlugins({ root })).version).toBe("2.0.0");
    config.version = "1.9.0";
    await writeJson(root, CONFIG_PATH, config);
    await expect(syncPlugins({ root })).rejects.toThrow("cannot go backwards");
    expect((await Bun.file(resolve(root, ".codex-plugin/plugin.json")).json()).version).toBe("2.0.0");
  });

  test("rejects corrupt fingerprints instead of silently reseeding a release", async () => {
    const root = await fixture();
    await syncPlugins({ root });
    await writeJson(root, STATE_PATH, { schemaVersion: 1 });
    await expect(syncPlugins({ root })).rejects.toThrow("is invalid");
  });
});

describe("metadata and asset checks", () => {
  test.each([
    ["placeholder", (config: any) => { config.author.name = "TODO"; }],
    ["unsupported field", (config: any) => { config.interface.fakeIcon = "./assets/bun-icon.svg"; }],
    ["long prompt", (config: any) => { config.interface.defaultPrompt = ["x".repeat(129)]; }],
    ["too many prompts", (config: any) => { config.interface.defaultPrompt = ["one", "two", "three", "four"]; }],
    ["invalid version", (config: any) => { config.version = "01.2.3"; }],
    ["invalid URL", (config: any) => { config.homepage = "http://github.com/itsbrex/bun-skills"; }],
    ["credentials in URL", (config: any) => { config.homepage = "https://user:password@github.com/itsbrex/bun-skills"; }],
    ["invalid color", (config: any) => { config.interface.brandColor = "pink"; }],
  ])("rejects %s before creating manifests", async (_name, mutate) => {
    const root = await fixture();
    const config = await loadPluginConfig(root);
    mutate(config);
    await writeJson(root, CONFIG_PATH, config);
    await expect(syncPlugins({ root })).rejects.toThrow();
    expect(await Bun.file(resolve(root, ".codex-plugin/plugin.json")).exists()).toBe(false);
  });

  test("missing and mislabeled images fail validation", async () => {
    const root = await fixture();
    await syncPlugins({ root });
    await rm(resolve(root, "assets/bun-logo.png"));
    expect((await validatePlugins(root)).join()).toContain("bun-logo.png");
    await Bun.write(resolve(root, "assets/bun-logo.png"), "not a PNG");
    expect((await validatePlugins(root)).join()).toContain("not a PNG");
  });

  test("rejects traversal and symlink assets outside the plugin", async () => {
    const root = await fixture();
    const config = await loadPluginConfig(root);
    config.interface.logo = "./assets/../../outside.png";
    await writeJson(root, CONFIG_PATH, config);
    await expect(syncPlugins({ root })).rejects.toThrow("relative path inside");
    config.interface.logo = "./assets/bun-logo.png";
    await writeJson(root, CONFIG_PATH, config);
    await rm(resolve(root, "assets/bun-logo.png"));
    await symlink(resolve(REPO_ROOT, "assets/bun-logo.png"), resolve(root, "assets/bun-logo.png"));
    await expect(syncPlugins({ root })).rejects.toThrow("escapes plugin root");
  });
});
