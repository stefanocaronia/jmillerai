import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import matter from "gray-matter";
import { marked } from "marked";

export type DevlogPost = {
  slug: string;
  title: string;
  title_it?: string;
  date: string;
  time: string;
  author: string;
  html: string;
  html_it?: string;
};

const VIRTUAL_ID = "virtual:devlog-posts";
const RESOLVED_ID = "\0" + VIRTUAL_ID;
const __dirname = dirname(fileURLToPath(import.meta.url));

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function devlogPlugin(): Plugin {
  const postsDir = resolve(__dirname, "devlog/posts");

  function findMarkdownFiles(dir: string): string[] {
    let results: string[] = [];
    try {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          results = results.concat(findMarkdownFiles(full));
        } else if (entry.endsWith(".md")) {
          results.push(full);
        }
      }
    } catch { /* dir doesn't exist */ }
    return results;
  }

  function loadPosts(): DevlogPost[] {
    const files = findMarkdownFiles(postsDir);
    if (files.length === 0) return [];

    return files
      .map((filePath: string) => {
        const raw = readFileSync(filePath, "utf-8");
        const { data, content } = matter(raw);
        const fileName = filePath.replace(/^.*[\\/]/, "");
        const title = (data.title as string) || fileName.replace(/\.md$/, "");
        const rawDate = data.date;
        const date = rawDate instanceof Date
          ? rawDate.toISOString().slice(0, 10)
          : String(rawDate ?? fileName.replace(/\.md$/, "")).slice(0, 10);
        const rawTime = data.time;
        const time = typeof rawTime === "number"
          ? `${String(Math.floor(rawTime / 60)).padStart(2, "0")}:${String(rawTime % 60).padStart(2, "0")}`
          : rawTime != null ? String(rawTime) : "";
        const titleIt = (data.title_it as string) || undefined;
        const enSplit = content.split(/<!--\s*EN\s*-->/i);
        const contentIt = enSplit.length > 1 ? enSplit[0].trim() : undefined;
        const contentEn = enSplit.length > 1 ? enSplit[1].trim() : enSplit[0].trim();
        return {
          slug: `${date}-${slugify(title)}`,
          title,
          title_it: titleIt,
          date,
          time,
          author: (data.author as string) || "",
          html: marked.parse(contentEn, { async: false, breaks: true }) as string,
          html_it: contentIt ? marked.parse(contentIt, { async: false, breaks: true }) as string : undefined,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  return {
    name: "vite-plugin-devlog",
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id === RESOLVED_ID) {
        const posts = loadPosts();
        return `export default ${JSON.stringify(posts)};`;
      }
    },
    handleHotUpdate({ file, server }) {
      if (file.endsWith(".md") && file.includes("devlog")) {
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) {
          server.moduleGraph.invalidateModule(mod);
          return [mod];
        }
      }
    },
  };
}
