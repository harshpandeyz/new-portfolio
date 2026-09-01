import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Keep browser development and static builds on the source package while
    // the API's compiled Node output consumes packages/shared/dist.
    alias: {
      "@hp/shared": path.resolve(configDir, "../../packages/shared/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
      "/static": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          gsap: ["gsap"],
          router: ["react-router-dom"],
        },
      },
    },
  },
});
