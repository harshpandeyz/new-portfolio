import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@hp/shared": path.resolve(configDir, "../../../packages/shared/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    testTimeout: 30000,
    hookTimeout: 120000,
    fileParallelism: false,
    globalSetup: ["tests/global-setup.ts"],
  },
});
