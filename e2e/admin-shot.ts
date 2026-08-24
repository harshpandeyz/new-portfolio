import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto("http://localhost:5173/private");
await page.waitForSelector("#ad-email", { timeout: 15000 });
await page.locator("#ad-email").fill("admin@harshpandey.dev");
await page.locator("#ad-password").fill("change-me-immediately");
await page.locator(".login-card button[type='submit']").click();
await page.waitForSelector(".stat-grid", { timeout: 15000 });
await page.screenshot({ path: "test-results/shot-admin.png" });

// projects CRUD screen
await page.locator(".admin-nav-item", { hasText: "PROJECTS" }).first().click();
await page.waitForTimeout(800);
await page.screenshot({ path: "test-results/shot-admin-projects.png" });

// messages
await page.locator(".admin-nav-item", { hasText: "MESSAGES" }).first().click();
await page.waitForTimeout(800);
await page.screenshot({ path: "test-results/shot-admin-messages.png" });

await browser.close();
console.log("admin shots saved");
