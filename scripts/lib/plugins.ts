import { mkdir, readdir, realpath, rename, rm } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { REPO_ROOT, errorMessage } from "./docs";

export const CONFIG_PATH = "plugin.config.json";
export const STATE_PATH = ".plugin-sync.json";
const COMMON_FIELDS = ["name", "version", "description", "author", "homepage", "repository", "license", "keywords"] as const;
const INTERFACE_FIELDS = [
  "displayName", "shortDescription", "longDescription", "category", "capabilities", "defaultPrompt", "brandColor",
  "composerIcon", "logo", "logoDark", "privacyPolicyURL", "termsOfServiceURL", "screenshots",
] as const;

export type PluginConfig = {
  name: string;
  version: string;
  description: string;
  author: { name: string; url: string; email?: string };
  homepage: string;
  repository: string;
  license: string;
  keywords: string[];
  interface: {
    displayName: string;
    shortDescription: string;
    longDescription: string;
    category: string;
    capabilities: string[];
    defaultPrompt: string[];
    brandColor: string;
    composerIcon: string;
    logo: string;
    logoDark: string;
    privacyPolicyURL?: string;
    termsOfServiceURL?: string;
    screenshots?: string[];
  };
};

type SyncState = { schemaVersion: 1; version: string; skillSetHash: string; contentHash: string };
type SkillProjection = { updated: ReadonlyMap<string, string>; removed: readonly string[] };
type SyncOptions = { root?: string; dryRun?: boolean; projection?: SkillProjection };

function object(value: unknown, field: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${field} must be an object`);
}

function text(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be a non-empty string`);
  if (/\[TODO\b|\b(?:TODO|TBD|PLACEHOLDER)\b|example\.(?:com|org|net)/i.test(value)) {
    throw new Error(`${field} contains placeholder metadata`);
  }
}

function strings(value: unknown, field: string): asserts value is string[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${field} must be a non-empty array`);
  value.forEach((item, index) => text(item, `${field}[${index}]`));
  if (new Set(value).size !== value.length) throw new Error(`${field} contains duplicates`);
}

function keys(value: Record<string, unknown>, allowed: readonly string[], field: string) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`${field}.${key} is unsupported`);
}

function https(value: unknown, field: string) {
  text(value, field);
  const url = new URL(value);
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password) {
    throw new Error(`${field} must be an HTTPS URL without credentials`);
  }
}

function versionParts(version: string): number[] {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error(`version must be a stable major.minor.patch release: ${version}`);
  }
  const parts = version.split(".").map(Number);
  if (!parts.every(Number.isSafeInteger)) throw new Error(`version exceeds the safe integer range: ${version}`);
  return parts;
}

export function validatePluginConfig(value: unknown): asserts value is PluginConfig {
  object(value, CONFIG_PATH);
  keys(value, [...COMMON_FIELDS, "interface"], CONFIG_PATH);
  for (const field of ["name", "version", "description", "license"] as const) text(value[field], field);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.name as string) || (value.name as string).length > 64) {
    throw new Error("name must be kebab-case and at most 64 characters");
  }
  versionParts(value.version as string);
  for (const field of ["homepage", "repository"] as const) https(value[field], field);
  strings(value.keywords, "keywords");
  object(value.author, "author");
  keys(value.author, ["name", "url", "email"], "author");
  text(value.author.name, "author.name");
  https(value.author.url, "author.url");
  if (value.author.email !== undefined) {
    text(value.author.email, "author.email");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.author.email)) throw new Error("author.email is invalid");
  }
  const ui = value.interface;
  object(ui, "interface");
  keys(ui, INTERFACE_FIELDS, "interface");
  for (const field of ["displayName", "shortDescription", "longDescription", "category", "brandColor", "composerIcon", "logo", "logoDark"]) {
    text(ui[field], `interface.${field}`);
  }
  if (!/^#[\da-fA-F]{6}$/.test(ui.brandColor as string)) throw new Error("interface.brandColor must use #RRGGBB");
  strings(ui.capabilities, "interface.capabilities");
  strings(ui.defaultPrompt, "interface.defaultPrompt");
  if (ui.defaultPrompt.length > 3 || ui.defaultPrompt.some((prompt) => prompt.length > 128)) {
    throw new Error("interface.defaultPrompt supports at most 3 prompts of at most 128 characters");
  }
  for (const field of ["privacyPolicyURL", "termsOfServiceURL"]) {
    if (ui[field] !== undefined) https(ui[field], `interface.${field}`);
  }
  if (ui.screenshots !== undefined) strings(ui.screenshots, "interface.screenshots");
}

export async function loadPluginConfig(root = REPO_ROOT): Promise<PluginConfig> {
  const config: unknown = await Bun.file(resolve(root, CONFIG_PATH)).json();
  validatePluginConfig(config);
  return config;
}

export function renderPluginManifests(config: PluginConfig) {
  const common = Object.fromEntries(COMMON_FIELDS.map((key) => [key, config[key]]));
  const claude = { ...common, displayName: config.interface.displayName, skills: "./skills/" };
  return {
    ".claude-plugin/plugin.json": {
      $schema: "https://json.schemastore.org/claude-code-plugin-manifest.json",
      ...claude,
    },
    ".claude-plugin/marketplace.json": {
      name: config.name,
      owner: { name: config.author.name, ...(config.author.email ? { email: config.author.email } : {}) },
      description: config.description,
      version: config.version,
      plugins: [{ ...claude, source: "./", category: "development", tags: config.keywords, strict: true }],
    },
    ".codex-plugin/plugin.json": {
      ...common,
      skills: "./skills/",
      interface: { ...config.interface, developerName: config.author.name, websiteURL: config.homepage },
    },
    ".agents/plugins/marketplace.json": {
      name: config.name,
      interface: { displayName: config.interface.displayName },
      plugins: [{
        name: config.name,
        source: { source: "local", path: "./" },
        policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
        category: config.interface.category,
      }],
    },
  };
}

function inside(root: string, path: string) {
  const rel = relative(root, path);
  return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

async function assetBytes(root: string, asset: string, screenshot: boolean) {
  if (!asset.startsWith("./assets/") || asset.includes("\\") || asset.split("/").includes("..")) {
    throw new Error(`asset must be a relative path inside ./assets/: ${asset}`);
  }
  const path = await realpath(resolve(root, asset));
  if (!inside(await realpath(root), path)) throw new Error(`asset escapes plugin root: ${asset}`);
  const bytes = await Bun.file(path).bytes();
  if (asset.endsWith(".png")) {
    if (bytes.length < 24 || Buffer.from(bytes.subarray(0, 8)).toString("hex") !== "89504e470d0a1a0a") {
      throw new Error(`asset is not a PNG: ${asset}`);
    }
  } else if (!screenshot && asset.endsWith(".svg")) {
    const svg = new TextDecoder().decode(bytes);
    if (!/<svg\b/.test(svg) || /<(?:script|foreignObject)\b/i.test(svg)) throw new Error(`asset is not a static SVG: ${asset}`);
  } else throw new Error(`asset must be ${screenshot ? "PNG" : "PNG or SVG"}: ${asset}`);
  return bytes;
}

async function inventory(root: string, config: PluginConfig, projection?: SkillProjection) {
  const skillsRoot = resolve(root, "skills");
  const rootReal = await realpath(root);
  const removed = new Set(projection?.removed ?? []);
  const directoryNames = (await readdir(skillsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const dirs = [...new Set([...directoryNames, ...(projection?.updated.keys() ?? [])])]
    .filter((dir) => !removed.has(dir)).sort();
  if (!dirs.length) throw new Error("skills/ must contain at least one skill");
  for (const dir of dirs) {
    if (!projection?.updated.has(dir) && !(await Bun.file(resolve(skillsRoot, dir, "SKILL.md")).exists())) {
      throw new Error(`${dir}: missing SKILL.md`);
    }
  }
  const hash = new Bun.CryptoHasher("sha256");
  // Include generated metadata without its release number, so generator changes also invalidate the release.
  hash.update(JSON.stringify(renderPluginManifests({ ...config, version: "0.0.0" })));
  const files = new Set(await Array.fromAsync(new Bun.Glob("**/*").scan({ cwd: skillsRoot, onlyFiles: true, dot: true })));
  for (const dir of projection?.updated.keys() ?? []) files.add(`${dir}/SKILL.md`);
  for (const file of [...files].sort()) {
    const dir = file.split("/")[0]!;
    if (removed.has(dir)) continue;
    const projected = file === `${dir}/SKILL.md` ? projection?.updated.get(dir) : undefined;
    let bytes: string | Uint8Array;
    if (projected !== undefined) bytes = projected;
    else {
      const path = await realpath(resolve(skillsRoot, file));
      if (!inside(rootReal, path)) throw new Error(`skill file escapes plugin root: ${file}`);
      bytes = await Bun.file(path).bytes();
    }
    hash.update(JSON.stringify([file, new Bun.CryptoHasher("sha256").update(bytes).digest("hex")]));
  }
  const ui = config.interface;
  const assets = new Set([ui.composerIcon, ui.logo, ui.logoDark, ...(ui.screenshots ?? [])]);
  for (const asset of [...assets].sort()) {
    hash.update(asset);
    hash.update(await assetBytes(root, asset, ui.screenshots?.includes(asset) ?? false));
  }
  return {
    skillCount: dirs.length,
    skillSetHash: new Bun.CryptoHasher("sha256").update(JSON.stringify(dirs)).digest("hex"),
    contentHash: hash.digest("hex"),
  };
}

async function readState(root: string): Promise<SyncState | undefined> {
  const file = Bun.file(resolve(root, STATE_PATH));
  if (!(await file.exists())) return undefined;
  const state = await file.json();
  if (!state || state.schemaVersion !== 1 || typeof state.version !== "string"
    || !/^[a-f0-9]{64}$/.test(state.skillSetHash) || !/^[a-f0-9]{64}$/.test(state.contentHash)) {
    throw new Error(`${STATE_PATH} is invalid; restore the last generated file before syncing`);
  }
  versionParts(state.version);
  return state;
}

async function atomicJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${crypto.randomUUID()}.tmp`;
  try {
    await Bun.write(temp, `${JSON.stringify(value, null, 2)}\n`);
    await rename(temp, path);
  } finally {
    await rm(temp, { force: true });
  }
}

export async function syncPlugins({ root = REPO_ROOT, dryRun = false, projection }: SyncOptions = {}) {
  if (projection && !dryRun) throw new Error("skill projections are only allowed in dry runs");
  const config = await loadPluginConfig(root);
  const current = await inventory(root, config, projection);
  const previous = await readState(root);
  const originalVersion = config.version;
  if (previous) {
    const oldParts = versionParts(previous.version);
    const newParts = versionParts(config.version);
    const firstDifference = newParts.findIndex((part, index) => part !== oldParts[index]);
    if (firstDifference !== -1 && newParts[firstDifference]! < oldParts[firstDifference]!) {
      throw new Error(`version cannot go backwards from ${previous.version} to ${config.version}`);
    }
    if (config.version === previous.version && current.contentHash !== previous.contentHash) {
      const [major = 0, minor = 0, patch = 0] = oldParts;
      config.version = current.skillSetHash !== previous.skillSetHash ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;
    }
  }
  const state: SyncState = { schemaVersion: 1, version: config.version, skillSetHash: current.skillSetHash, contentHash: current.contentHash };
  const output: Record<string, unknown> = { ...renderPluginManifests(config), [STATE_PATH]: state };
  const changed: string[] = [];
  if (config.version !== originalVersion) {
    changed.push(CONFIG_PATH);
    if (!dryRun) await atomicJson(resolve(root, CONFIG_PATH), config);
  }
  // Commit the fingerprint last. Retrying an interrupted write repairs manifests without another bump.
  for (const [path, value] of Object.entries(output)) {
    const file = Bun.file(resolve(root, path));
    if ((await file.exists()) && (await file.text()) === `${JSON.stringify(value, null, 2)}\n`) continue;
    changed.push(path);
    if (!dryRun) await atomicJson(resolve(root, path), value);
  }
  return { version: config.version, skillCount: current.skillCount, changed, dryRun };
}

export async function validatePlugins(root = REPO_ROOT): Promise<string[]> {
  try {
    const result = await syncPlugins({ root, dryRun: true });
    return result.changed.map((path) => `${path} is stale or missing (run bun run sync:plugins)`);
  } catch (error) {
    return [`plugins: ${errorMessage(error)}`];
  }
}
