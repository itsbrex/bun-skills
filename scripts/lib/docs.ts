import { resolve } from "node:path";

export const REPO_ROOT = resolve(import.meta.dir, "../..");
export const SKILLS_DIR = `${REPO_ROOT}/skills`;
export const CACHE_DIR = `${REPO_ROOT}/.cache`;

export const LLMS_TXT_URL = "https://bun.com/docs/llms.txt";
export const GUIDES_PAGE_URL = "https://bun.com/guides";

export const MAX_SKILL_NAME_LENGTH = 64;
export const MAX_DESCRIPTION_LENGTH = 1024;

export type DocEntry = {
  /** Page title from llms.txt, e.g. "Convert a Blob to a string". */
  title: string;
  /** Docs path without extension, e.g. "guides/binary/blob-to-string". */
  path: string;
  /** llms.txt description, falling back to the title. */
  description: string;
  /** Skill directory name, e.g. "bun-guides-binary-blob-to-string". */
  dir: string;
};

export const skillDirFor = (docPath: string) => `bun-${docPath.replaceAll("/", "-")}`;

// Section landing pages are listed as `<section>/index.md` in llms.txt but served at `<section>.md`.
export function markdownUrlFor(docPath: string): string {
  if (docPath === "index") return "https://bun.com/docs.md";
  return `https://bun.com/docs/${docPath.replace(/\/index$/, "")}.md`;
}

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

/** GET a URL as text, retrying network errors and 5xx/429 responses with backoff. */
export async function fetchText(url: string, { accept = "*/*", attempts = 4 } = {}): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { headers: { accept, "user-agent": "bun-skills-sync" } });
      if (!res.ok) throw new HttpError(res.status);
      return await res.text();
    } catch (error) {
      lastError = error;
      const retryable = !(error instanceof HttpError) || error.status === 429 || error.status >= 500;
      if (!retryable) break;
      if (attempt < attempts) await Bun.sleep(500 * attempt);
    }
  }
  throw new Error(`GET ${url} failed: ${errorMessage(lastError)}`);
}

const LLMS_ENTRY_RE = /^- \[(.+?)\]\(https:\/\/bun\.com\/docs\/(.+?)\.md\)(?::\s*(.+))?$/gm;

export function parseLlmsTxt(text: string): DocEntry[] {
  const byPath = new Map<string, DocEntry>();
  for (const match of text.matchAll(LLMS_ENTRY_RE)) {
    const [, title = "", path = "", description] = match;
    if (byPath.has(path)) continue;
    byPath.set(path, {
      title: title.trim(),
      path,
      description: (description ?? title).trim(),
      dir: skillDirFor(path),
    });
  }
  return [...byPath.values()];
}

export async function loadDocIndex(): Promise<DocEntry[]> {
  const entries = parseLlmsTxt(await fetchText(LLMS_TXT_URL, { accept: "text/plain" }));
  if (entries.length === 0) throw new Error(`no pages parsed from ${LLMS_TXT_URL}; has its format changed?`);
  return entries;
}

// ---------------------------------------------------------------------------------------------
// SKILL.md files

const SKILL_FILE_RE = /^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/;

export type SkillFile = { frontmatter: Record<string, unknown>; body: string };

/** Parse a SKILL.md written by renderSkillFile. Throws on malformed frontmatter. */
export function parseSkillFile(text: string): SkillFile {
  const match = text.match(SKILL_FILE_RE);
  if (!match) throw new Error("expected `---` frontmatter, a blank line, then the body");
  const frontmatter = Bun.YAML.parse(match[1] ?? "");
  if (typeof frontmatter !== "object" || frontmatter === null || Array.isArray(frontmatter)) {
    throw new Error("frontmatter is not a YAML mapping");
  }
  return { frontmatter: frontmatter as Record<string, unknown>, body: match[2] ?? "" };
}

export async function readSkillName(dir: string): Promise<string | null> {
  const file = Bun.file(`${SKILLS_DIR}/${dir}/SKILL.md`);
  if (!(await file.exists())) return null;
  try {
    const { name } = parseSkillFile(await file.text()).frontmatter;
    return typeof name === "string" ? name : null;
  } catch {
    return null;
  }
}

const needsQuoting = (value: string) => /: |\s#|^[\s[\]{}&*!|>'"%@`,?:-]|\s$/.test(value);
const yamlScalar = (value: string) => (needsQuoting(value) ? JSON.stringify(value) : value);

export function renderSkillFile({ name, description, body }: { name: string; description: string; body: string }) {
  return `---\nname: ${yamlScalar(name)}\ndescription: ${yamlScalar(description)}\n---\n\n${body.replace(/\s+$/, "")}\n`;
}
