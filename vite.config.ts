import { resolve } from "node:path";
import { defineConfig } from "vite";
import devlogPlugin from "./vite-plugin-devlog";
import introPlugin from "./vite-plugin-intro";
import i18nPlugin from "./vite-plugin-i18n";

export default defineConfig({
  base: "/",
  server: { port: 3000, host: true },
  plugins: [devlogPlugin(), introPlugin(), i18nPlugin()],
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, "index.html"),
        traces: resolve(__dirname, "traces/index.html"),
        surface: resolve(__dirname, "surface/index.html"),
        loop: resolve(__dirname, "loop/index.html"),
        mind: resolve(__dirname, "mind/index.html"),
        contacts: resolve(__dirname, "contacts/index.html"),
        devlog: resolve(__dirname, "devlog/index.html"),
      },
    },
  },
});
