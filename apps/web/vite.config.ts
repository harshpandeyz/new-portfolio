import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const apiPort = process.env.VITE_API_PORT ?? "4000";

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
    // A port change silently breaks the API proxy and can make local QA
    // exercise a different process than the one developers intended.
    strictPort: true,
    proxy: {
      "/api": { target: `http://127.0.0.1:${apiPort}`, changeOrigin: true },
      "/static": { target: `http://127.0.0.1:${apiPort}`, changeOrigin: true },
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
