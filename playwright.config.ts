import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    screenshot: "only-on-failure",
  },
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : [
        {
          command: "npm run build --workspace @hp/shared && npx tsx apps/api/src/server.ts",
          port: 4000,
          cwd: configDir,
          reuseExistingServer: true,
          env: { ...process.env },
        },
        {
          command: "npx vite apps/web --config apps/web/vite.config.ts --port 5173",
          port: 5173,
          cwd: configDir,
          reuseExistingServer: true,
        },
      ],
});
