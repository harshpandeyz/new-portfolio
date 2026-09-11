import { config } from "./config.js";
import { buildApp } from "./app.js";
import { prisma } from "./db/prisma.js";

async function main() {
  const app = await buildApp();
  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "shutting down");
    try {
      await app.close();
    } catch {
      /* already closing */
    }
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  };
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
    app.log.info(`API listening on :${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
