import { type DocEntry, GUIDES_PAGE_URL, errorMessage, fetchText } from "./docs";
import { renderWithLightpanda } from "./lightpanda";

export type GuideCategory = {
  /** Heading shown on the guides page, e.g. "Binary data". */
  title: string;
  /** Shared path prefix of the category's guides, e.g. "guides/binary". */
  prefix: string;
  /** Guide paths linked under the heading, in page order. */
  paths: string[];
};

export type GuidesPage = {
  source: "lightpanda" | "fetch" | "none";
  categories: GuideCategory[];
  warnings: string[];
};

export const guidePrefixOf = (guidePath: string) => guidePath.split("/").slice(0, 2).join("/");

export function guidePathFromHref(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href, GUIDES_PAGE_URL);
  } catch {
    return null;
  }
  if (url.hostname !== "bun.com") return null;
  const path = url.pathname.replace(/^\/(docs\/)?/, "").replace(/\/$/, "");
  return /^guides\/[^/]+\/[^/]+/.test(path) ? path : null;
}

/**
 * Read guide categories off the guides page: each `<h3>` heading owns the guide links after it.
 * Links before the first heading (the "Featured" row) are ignored, and each category keeps only
 * links sharing its dominant path prefix so stray footer links cannot leak in.
 */
export function parseGuideCategories(html: string): GuideCategory[] {
  const sections: { title: string; paths: string[] }[] = [];
  new HTMLRewriter()
    .on("h3", {
      element() {
        sections.push({ title: "", paths: [] });
      },
      text(chunk) {
        const section = sections.at(-1);
        if (section) section.title += chunk.text;
      },
    })
    .on("a[href]", {
      element(link) {
        const section = sections.at(-1);
        const path = section && guidePathFromHref(link.getAttribute("href") ?? "");
        if (section && path) section.paths.push(path);
      },
    })
    .transform(html);

  const categories: GuideCategory[] = [];
  for (const section of sections) {
    const counts = new Map<string, number>();
    for (const path of section.paths) counts.set(guidePrefixOf(path), (counts.get(guidePrefixOf(path)) ?? 0) + 1);
    const [prefix] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [];
    if (!prefix || categories.some((category) => category.prefix === prefix)) continue;
    categories.push({
      title: section.title.replace(/\s+/g, " ").trim(),
      prefix,
      paths: [...new Set(section.paths.filter((path) => guidePrefixOf(path) === prefix))],
    });
  }
  return categories;
}

/** Load guide categories, rendering with Lightpanda first and falling back to a plain fetch. */
export async function loadGuidesPage({ useBrowser }: { useBrowser: boolean }): Promise<GuidesPage> {
  const warnings: string[] = [];
  if (useBrowser) {
    try {
      const categories = parseGuideCategories(await renderWithLightpanda(GUIDES_PAGE_URL));
      if (categories.length > 0) return { source: "lightpanda", categories, warnings };
      warnings.push(`Lightpanda render of ${GUIDES_PAGE_URL} had no guide categories; fell back to plain fetch`);
    } catch (error) {
      warnings.push(`Lightpanda render failed (${errorMessage(error)}); fell back to plain fetch`);
    }
  }
  try {
    const categories = parseGuideCategories(await fetchText(GUIDES_PAGE_URL, { accept: "text/html" }));
    if (categories.length > 0) return { source: "fetch", categories, warnings };
    warnings.push(`no guide categories found on ${GUIDES_PAGE_URL}; titled categories from guide paths`);
  } catch (error) {
    warnings.push(`plain fetch of ${GUIDES_PAGE_URL} failed (${errorMessage(error)}); titled categories from guide paths`);
  }
  return { source: "none", categories: [], warnings };
}

const titleFromSlug = (slug: string) => slug.replaceAll("-", " ").replace(/^./, (c) => c.toUpperCase());

/**
 * Body of the `guides/index` skill. The live landing page is only a `<GuidesList />` JSX stub, so
 * list every guide from llms.txt, grouped by the categories from the guides page (in page order).
 */
export function renderGuidesIndexBody(index: DocEntry, entries: DocEntry[], page: GuidesPage, warnings: string[]) {
  const guides = entries.filter((entry) => entry.path.startsWith("guides/") && entry.path !== index.path);
  const known = new Set(guides.map((guide) => guide.path));
  const unlisted = page.categories.flatMap((category) => category.paths).filter((path) => !known.has(path));
  if (unlisted.length > 0) {
    warnings.push(`guides on ${GUIDES_PAGE_URL} missing from llms.txt (no skill generated): ${unlisted.join(", ")}`);
  }

  const categories = page.categories.map(({ title, prefix }) => ({ title, prefix }));
  for (const guide of guides) {
    const prefix = guidePrefixOf(guide.path);
    if (categories.some((category) => category.prefix === prefix)) continue;
    categories.push({ title: titleFromSlug(prefix.split("/")[1] ?? prefix), prefix });
    if (page.categories.length > 0) warnings.push(`guide category ${prefix} is not on ${GUIDES_PAGE_URL}; titled from its path`);
  }

  const lines = [
    `# ${index.title}`,
    "",
    `> ${index.description}`,
    "",
    "Each guide below is also available as its own skill named `bun-<path with / replaced by ->` (for example `guides/http/simple` is `bun-guides-http-simple`).",
  ];
  for (const { title, prefix } of categories) {
    const inCategory = guides.filter((guide) => guidePrefixOf(guide.path) === prefix);
    if (inCategory.length === 0) continue;
    lines.push("", `## ${title}`, "");
    for (const guide of inCategory) lines.push(`- [${guide.title}](/${guide.path})`);
  }
  return `${lines.join("\n")}\n`;
}
