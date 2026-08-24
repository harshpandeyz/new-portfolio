import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    testTimeout: 30000,
    hookTimeout: 120000,
    fileParallelism: false,
    globalSetup: ["tests/global-setup.ts"],
  },
});
