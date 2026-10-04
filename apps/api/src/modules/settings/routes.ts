import type { FastifyInstance } from "fastify";
import { siteSettingsInputSchema } from "@hp/shared";

import { requireCsrf } from "../auth/routes.js";
import { requireAdminRole, requirePermission } from "../auth/rbac.js";
import { audit, clientIp, HttpError, noStore, parseBody } from "../../utils/http.js";
import { rateLimit } from "../../utils/rate-limit.js";
import { getSiteSettings, saveSiteSettings } from "./store.js";

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/public", async (_req, reply) => {
    noStore(reply);
    const settings = await getSiteSettings();
    return { settings: { chatEnabled: settings.chatEnabled, contactEnabled: settings.contactEnabled, maintenanceMode: settings.maintenanceMode } };
  });

  app.get("/", { preHandler: [requirePermission("content:read")] }, async (_req, reply) => {
    noStore(reply);
    return { settings: await getSiteSettings() };
  });

  app.patch("/", { preHandler: [requireAdminRole, requireCsrf] }, async (req) => {
    const limit = await rateLimit(`settings:${clientIp(req)}`, 30, 10 * 60 * 1000);
    if (!limit.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many changes. Try again later.");
    const settings = parseBody(req, siteSettingsInputSchema);
    await saveSiteSettings(settings);
    await audit(req, "SETTINGS_UPDATED", "site_settings", null, { keys: Object.keys(settings) });
    return { settings };
  });
}
