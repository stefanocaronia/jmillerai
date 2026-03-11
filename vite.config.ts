import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/jmillerai/",
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, "index.html"),
        map: resolve(__dirname, "map.html"),
        contacts: resolve(__dirname, "contacts.html"),
      },
    },
  },
});
