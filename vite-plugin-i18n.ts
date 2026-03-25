import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import yaml from "js-yaml";

const VIRTUAL_ID = "virtual:i18n";
const RESOLVED_ID = "\0" + VIRTUAL_ID;
const __dirname = dirname(fileURLToPath(import.meta.url));

export default function i18nPlugin(): Plugin {
  return {
    name: "vite-plugin-i18n",
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id === RESOLVED_ID) {
        const filePath = resolve(__dirname, "content/i18n.yaml");
        const raw = readFileSync(filePath, "utf-8");
        const data = yaml.load(raw);
        return `export default ${JSON.stringify(data)};`;
      }
    },
    handleHotUpdate({ file, server }) {
      if (file.endsWith("i18n.yaml")) {
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) {
          server.moduleGraph.invalidateModule(mod);
          return [mod];
        }
      }
    },
  };
}
