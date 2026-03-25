import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { marked } from "marked";

export type IntroSection = {
  title?: string;
  html: string;
};

export type IntroData = {
  en: IntroSection[];
  it: IntroSection[];
};

const VIRTUAL_ID = "virtual:intro-sections";
const RESOLVED_ID = "\0" + VIRTUAL_ID;
const __dirname = dirname(fileURLToPath(import.meta.url));

/** Custom spoiler syntax: ||Button label|hidden content|| */
function transformSpoilers(html: string): string {
  return html.replace(
    /\|\|([^|]+)\|([^|]+?)\|\|/g,
    (_match, label: string, content: string) =>
      `<span class="spoiler-block" data-spoiler><button type="button" class="spoiler-toggle" data-spoiler-toggle>${label.trim()}</button><span class="spoiler-content" data-spoiler-content hidden>${content}</span></span>`,
  );
}

function loadIntroFile(filename: string): IntroSection[] {
  const filePath = resolve(__dirname, `content/${filename}`);
  const raw = readFileSync(filePath, "utf-8");

  // Split on ## headings — first chunk has no title
  const chunks = raw.split(/^## /m);
  return chunks
    .map((chunk, index) => {
      if (index === 0) {
        const trimmed = chunk.trim();
        if (!trimmed) return null;
        const html = marked.parse(trimmed, { async: false, breaks: true }) as string;
        return { html: transformSpoilers(html) };
      }
      const newlineIndex = chunk.indexOf("\n");
      const title = chunk.slice(0, newlineIndex).trim();
      const body = chunk.slice(newlineIndex + 1).trim();
      const html = marked.parse(body, { async: false, breaks: true }) as string;
      return { title, html: transformSpoilers(html) };
    })
    .filter((s): s is IntroSection => s !== null);
}

export default function introPlugin(): Plugin {
  return {
    name: "vite-plugin-intro",
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id === RESOLVED_ID) {
        const data: IntroData = {
          en: loadIntroFile("intro.md"),
          it: loadIntroFile("intro-it.md"),
        };
        return `export default ${JSON.stringify(data)};`;
      }
    },
    handleHotUpdate({ file, server }) {
      if (file.endsWith("intro.md") || file.endsWith("intro-it.md")) {
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) {
          server.moduleGraph.invalidateModule(mod);
          return [mod];
        }
      }
    },
  };
}
