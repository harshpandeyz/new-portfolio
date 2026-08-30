import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "desktop-xl", width: 1440, height: 900 },
  { name: "desktop-lg", width: 1280, height: 800 },
  { name: "desktop-md", width: 1024, height: 768 },
  { name: "tablet-portrait", width: 768, height: 1024 },
  { name: "mobile-lg", width: 430, height: 932 },
  { name: "mobile-md", width: 390, height: 844 },
];

const ROUTES = [
  { path: "/", name: "home" },
  { path: "/#work", name: "work" },
  { path: "/#about", name: "about" },
  { path: "/#capabilities", name: "capabilities" },
  { path: "/#journey", name: "journey" },
  { path: "/#credentials", name: "credentials" },
  { path: "/#contact", name: "contact" },
  { path: "/recruiter", name: "recruiter" },
];

for (const viewport of VIEWPORTS) {
  for (const route of ROUTES) {
    test(`${route.name} @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(route.path);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow, `Horizontal overflow detected at ${viewport.name} for ${route.path}`).toBe(false);
      await expect(page.locator("body")).toHaveScreenshot(`${route.name}-${viewport.name}.png`, {
        fullPage: true,
        animations: "disabled",
        threshold: 0.2,
        maxDiffPixels: 1000,
      });
    });
  }
}

test.describe("Interactive surfaces", () => {
  for (const viewport of VIEWPORTS.slice(0, 3)) {
    test(`command palette @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await page.keyboard.press("Meta+KeyK");
      await expect(page.locator(".palette")).toBeVisible();
      await expect(page.locator(".palette")).toHaveScreenshot(`command-palette-${viewport.name}.png`, {
        animations: "disabled",
      });
      await page.keyboard.press("Escape");
    });

    test(`chat widget @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await page.locator(".chat-fab").click();
      await expect(page.locator(".chat-panel")).toBeVisible();
      await expect(page.locator(".chat-panel")).toHaveScreenshot(`chat-widget-${viewport.name}.png`, {
        animations: "disabled",
      });
      await page.keyboard.press("Escape");
    });
  }
});