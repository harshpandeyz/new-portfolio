import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:5173",
    screenshot: "only-on-failure",
  },
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : [
        {
          command: "npx tsx apps/api/src/server.ts",
          port: 4000,
          cwd: __dirname,
          reuseExistingServer: true,
          env: { ...process.env },
        },
        {
          command: "npx vite apps/web --config apps/web/vite.config.ts --port 5173",
          port: 5173,
          cwd: __dirname,
          reuseExistingServer: true,
        },
      ],
});
