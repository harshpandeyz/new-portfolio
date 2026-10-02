import { test, expect, type Page } from "@playwright/test";

const ALL_VIEWPORTS = [
  { name: "ultrawide", width: 2560, height: 1080 },
  { name: "desktop-xl", width: 1440, height: 900 },
  { name: "desktop-lg", width: 1280, height: 800 },
  { name: "desktop-md", width: 1024, height: 768 },
  { name: "tablet-portrait", width: 768, height: 1024 },
  { name: "mobile-lg", width: 430, height: 932 },
  { name: "mobile-md", width: 390, height: 844 },
  { name: "mobile-xs", width: 360, height: 740 },
];

// Committed baseline matrix is deliberately small (desktop + one phone) so a
// lean repository still carries real per-route regression coverage. Run the
// full sweep locally with QA_VIEWPORTS=all — generated files are gitignored.
const CORE_VIEWPORTS = [
  { name: "desktop-xl", width: 1440, height: 900 },
  { name: "mobile-md", width: 390, height: 844 },
];

const VIEWPORTS = process.env.QA_VIEWPORTS === "all" ? ALL_VIEWPORTS : CORE_VIEWPORTS;

/**
 * One capture per page *segment*. Each home section is captured by navigating
 * to its hash with prefers-reduced-motion: reduce. Scroll-triggered reveals
 * are intentionally omitted, so content is visible before hydration and a screenshot for
 * one route can never accidentally show another — it is a viewport of the
 * exact element the hash targets, with no force-scrolling.
 */
function routes() {
  const segments = [
    { path: "/", name: "home" },
    { path: "/#about", name: "about" },
    { path: "/#journey", name: "journey" },
    { path: "/#work", name: "work" },
    { path: "/#tech", name: "tech" },
    { path: "/#credentials", name: "credentials" },
    { path: "/#contact", name: "contact" },
  ];
  const pages = [
    { path: "/projects", name: "projects" },
    { path: "/projects/quantummind", name: "case-quantummind" },
    { path: "/credentials", name: "credential-archive" },
    { path: "/recruiter", name: "recruiter" },
  ];
  return [...segments, ...pages];
}

async function openRoute(page: Page, path: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  // Respect the user's scroll-restoration settings; a direct hash jump lands
  // on the section, and reduced motion means no animation can hide content.
  await page.waitForTimeout(350);
}

for (const viewport of VIEWPORTS) {
  for (const { path, name } of routes()) {
    test(`${name} @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openRoute(page, path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow, `Horizontal overflow detected at ${viewport.name} for ${path}`).toBe(false);
      await expect(page.locator("body")).toHaveScreenshot(`${name}-${viewport.name}.png`, {
        animations: "disabled",
        threshold: 0.2,
        maxDiffPixels: 1000,
      });
    });
  }
}

// A full responsive sweep is kept separate from visual baselines so routine
// checks cover every target width without committing dozens of near-duplicate
// screenshots. Captures remain available under test-results for visual review.
test.describe("Responsive inspection", () => {
  const responsiveRoutes = ["/", "/recruiter", "/projects", "/projects/quantummind", "/credentials"];
  for (const viewport of ALL_VIEWPORTS) {
    test(`home, recruiter and public routes @ ${viewport.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const route of responsiveRoutes) {
        await openRoute(page, route);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        expect(overflow, `Horizontal overflow detected at ${viewport.name} for ${route}`).toBe(false);
        if (route === "/" || route === "/recruiter") {
          await page.screenshot({
            path: testInfo.outputPath(`${route === "/" ? "home" : "recruiter"}.png`),
            fullPage: true,
            animations: "disabled",
          });
        }
      }
    });
  }
});

test.describe("Interactive surfaces", () => {
  for (const viewport of VIEWPORTS) {
    test(`command palette @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openRoute(page, "/");
      await page.keyboard.press("Meta+KeyK");
      await expect(page.locator(".palette")).toBeVisible();
      await expect(page.locator(".palette")).toHaveScreenshot(`command-palette-${viewport.name}.png`, {
        animations: "disabled",
      });
      await page.keyboard.press("Escape");
    });

    test(`chat widget @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openRoute(page, "/");
      await page.locator(".chat-fab").click();
      await expect(page.locator(".chat-panel")).toBeVisible();
      await expect(page.locator(".chat-input")).toBeFocused();
      await expect(page.locator(".chat-suggest-btn")).toHaveCount(5);
      await expect(page.locator(".chat-panel")).toHaveScreenshot(`chat-widget-${viewport.name}.png`, {
        animations: "disabled",
      });
      await page.keyboard.press("Escape");
    });
  }
});

test.describe("Responsive keyboard surfaces", () => {
  for (const viewport of ALL_VIEWPORTS) {
    test(`palette and assistant keyboard lifecycle @ ${viewport.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openRoute(page, "/");

      await page.keyboard.press("ControlOrMeta+k");
      const palette = page.locator(".palette");
      await expect(palette).toBeVisible();
      await expect(palette.locator("input")).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath("palette.png"), animations: "disabled" });
      await page.keyboard.press("Escape");
      await expect(palette).toBeHidden();

      const launcher = page.locator(".chat-fab");
      await launcher.focus();
      await page.keyboard.press("Enter");
      const assistant = page.locator(".chat-panel");
      await expect(assistant).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath("assistant.png"), animations: "disabled" });
      await page.keyboard.press("Escape");
      await expect(assistant).toBeHidden();
      await expect(launcher).toBeFocused();
    });
  }
});
