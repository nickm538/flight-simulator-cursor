import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: "client",
  publicDir: "public",
  build: {
    outDir: resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: true,
    chunkSizeWarningLimit: 1800,
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:3000",
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
});
