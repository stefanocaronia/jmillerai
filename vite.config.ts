import { resolve } from "node:path";
import { defineConfig } from "vite";
import devlogPlugin from "./vite-plugin-devlog";

export default defineConfig({
  base: "/",
  plugins: [devlogPlugin()],
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, "index.html"),
        traces: resolve(__dirname, "traces/index.html"),
        surface: resolve(__dirname, "surface/index.html"),
        loop: resolve(__dirname, "loop/index.html"),
        memory: resolve(__dirname, "memory/index.html"),
        contacts: resolve(__dirname, "contacts/index.html"),
        devlog: resolve(__dirname, "devlog/index.html"),
      },
    },
  },
});
