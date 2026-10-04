import { prisma } from "../../db/prisma.js";
import { isAnalyticsEnabled } from "../settings/store.js";
import type { AnalyticsEventType } from "@hp/shared";

const PUBLIC_PAGES = new Set(["/", "/recruiter", "/projects", "/credentials"]);
const CONFIDENCE = new Set(["VERIFIED", "INFERRED", "UNKNOWN"]);

async function safeAnalyticsRef(type: AnalyticsEventType, ref?: string): Promise<string | null> {
  const value = ref?.trim() ?? "";
  if (!value) return null;
  if (type === "page_view") return PUBLIC_PAGES.has(value) ? value : null;
  if (type === "project_view" && /^[a-z0-9][a-z0-9-]{0,119}$/.test(value)) {
    const project = await prisma.project.findFirst({ where: { slug: value, status: { not: "draft" } }, select: { slug: true } });
    return project?.slug ?? null;
  }
  if (type === "chat_query" && CONFIDENCE.has(value)) return value;
  return null;
}

/** Record only a minimal event and allowlisted reference while analytics is enabled. */
export async function trackAnalyticsEvent(
  type: AnalyticsEventType,
  ref?: string,
): Promise<boolean> {
  if (!(await isAnalyticsEnabled())) return false;
  const safeRef = await safeAnalyticsRef(type, ref);
  await prisma.analyticsEvent.create({ data: { type, ref: safeRef } });
  return true;
}
