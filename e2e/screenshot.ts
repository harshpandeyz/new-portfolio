import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto("http://localhost:5173/");
await page.waitForTimeout(3500); // boot completes
await page.screenshot({ path: "test-results/shot-hero.png" });

await page.evaluate(() => document.getElementById("identity")?.scrollIntoView());
await page.waitForTimeout(1200);
await page.screenshot({ path: "test-results/shot-identity.png" });

await page.evaluate(() => document.getElementById("projects")?.scrollIntoView());
await page.waitForTimeout(1200);
await page.screenshot({ path: "test-results/shot-projects.png" });

await page.goto("http://localhost:5173/projects/intelligent-surveillance-system");
await page.waitForTimeout(1500);
await page.screenshot({ path: "test-results/shot-case.png" });

await page.goto("http://localhost:5173/recruiter");
await page.waitForTimeout(1000);
await page.screenshot({ path: "test-results/shot-recruiter.png" });

await browser.close();
console.log("screenshots saved");
