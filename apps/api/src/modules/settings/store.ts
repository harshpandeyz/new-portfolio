import type { SiteSettings } from "@hp/shared";

import { prisma } from "../../db/prisma.js";

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  chatEnabled: true,
  contactEnabled: true,
  analyticsEnabled: true,
  maintenanceMode: false,
};

const KEY_BY_SETTING: Record<keyof SiteSettings, string> = {
  chatEnabled: "feature.chat",
  contactEnabled: "feature.contact",
  analyticsEnabled: "feature.analytics",
  maintenanceMode: "site.maintenance",
};

let cache: { value: SiteSettings; expiresAt: number } | null = null;

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: Object.values(KEY_BY_SETTING) } } });
  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  const value = {
    chatEnabled: parseBoolean(byKey.get(KEY_BY_SETTING.chatEnabled), DEFAULT_SITE_SETTINGS.chatEnabled),
    contactEnabled: parseBoolean(byKey.get(KEY_BY_SETTING.contactEnabled), DEFAULT_SITE_SETTINGS.contactEnabled),
    analyticsEnabled: parseBoolean(byKey.get(KEY_BY_SETTING.analyticsEnabled), DEFAULT_SITE_SETTINGS.analyticsEnabled),
    maintenanceMode: parseBoolean(byKey.get(KEY_BY_SETTING.maintenanceMode), DEFAULT_SITE_SETTINGS.maintenanceMode),
  };
  cache = { value, expiresAt: Date.now() + 10_000 };
  return value;
}

export async function saveSiteSettings(settings: SiteSettings): Promise<void> {
  await prisma.$transaction(
    (Object.entries(KEY_BY_SETTING) as [keyof SiteSettings, string][]).map(([setting, key]) =>
      prisma.siteSetting.upsert({
        where: { key },
        update: { value: String(settings[setting]) },
        create: { key, value: String(settings[setting]) },
      }),
    ),
  );
  cache = { value: settings, expiresAt: Date.now() + 10_000 };
}
