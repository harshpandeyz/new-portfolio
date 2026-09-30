import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const apiPort = Number(process.env.E2E_API_PORT ?? 4000);
const webPort = Number(process.env.E2E_WEB_PORT ?? 5173);

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  // Admin acceptance mutates the same disposable database as the public
  // browser checks. One worker keeps those release tests deterministic and
  // prevents a temporary CMS record from changing a visual baseline.
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${webPort}`,
    screenshot: "only-on-failure",
  },
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : [
        {
          command: "npm run build --workspace @hp/shared && npx tsx apps/api/src/server.ts",
          port: apiPort,
          cwd: configDir,
          reuseExistingServer: false,
          env: { ...process.env, API_PORT: String(apiPort) },
        },
        {
          command: `npx vite apps/web --config apps/web/vite.config.ts --port ${webPort}`,
          port: webPort,
          cwd: configDir,
          reuseExistingServer: false,
          env: { ...process.env, VITE_API_PORT: String(apiPort) },
        },
      ],
});
