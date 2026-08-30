import { chromium } from "@playwright/test";

const BASE = process.env.QA_BASE ?? "http://localhost:5173";
const OUT = "test-results/qa";
const browser = await chromium.launch();
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await desktop.goto(`${BASE}/`);
await desktop.waitForTimeout(3500);
await desktop.screenshot({ path: `${OUT}/01-hero.png` });

// work
await desktop.evaluate(() => document.getElementById("work")?.scrollIntoView());
await desktop.waitForTimeout(1500);
await desktop.screenshot({ path: `${OUT}/02-work.png` });

// about
await desktop.evaluate(() => document.getElementById("about")?.scrollIntoView());
await desktop.waitForTimeout(1600);
await desktop.screenshot({ path: `${OUT}/03-about.png` });

// capabilities
await desktop.evaluate(() => document.getElementById("capabilities")?.scrollIntoView());
await desktop.waitForTimeout(1500);
await desktop.screenshot({ path: `${OUT}/04-capabilities.png` });

// journey
await desktop.evaluate(() => document.getElementById("journey")?.scrollIntoView());
await desktop.waitForTimeout(1500);
await desktop.screenshot({ path: `${OUT}/05-journey.png` });

// credentials
await desktop.evaluate(() => document.getElementById("credentials")?.scrollIntoView());
await desktop.waitForTimeout(1500);
await desktop.screenshot({ path: `${OUT}/06-credentials.png` });

// credentials full vault
await desktop.getByRole("button", { name: /View all credentials/i }).click();
await desktop.waitForSelector(".vault-grid .vault-item", { timeout: 20000 });
await desktop.waitForTimeout(800);
await desktop.screenshot({ path: `${OUT}/07-vault.png` });

// credential modal
await desktop.locator(".vault-grid .vault-item").first().click();
await desktop.waitForSelector(".credential-viewer", { timeout: 10000 });
await desktop.waitForTimeout(1200);
await desktop.screenshot({ path: `${OUT}/08-credential-modal.png` });
await desktop.keyboard.press("Escape");

// resume viewer
await desktop.locator(".topbar").getByRole("button", { name: /Résumé/ }).click();
await desktop.waitForSelector(".resume-viewer", { timeout: 10000 });
await desktop.waitForTimeout(1200);
await desktop.screenshot({ path: `${OUT}/09-resume-viewer.png` });
await desktop.keyboard.press("Escape");

// contact
await desktop.evaluate(() => document.getElementById("contact")?.scrollIntoView());
await desktop.waitForTimeout(1500);
await desktop.screenshot({ path: `${OUT}/10-contact.png` });

// palette
await desktop.keyboard.press("ControlOrMeta+k");
await desktop.waitForSelector(".palette", { timeout: 5000 });
await desktop.waitForTimeout(400);
await desktop.screenshot({ path: `${OUT}/11-palette.png` });
await desktop.keyboard.press("Escape");

// closing
await desktop.evaluate(() => document.getElementById("exit")?.scrollIntoView());
await desktop.waitForTimeout(1500);
await desktop.screenshot({ path: `${OUT}/12-closing.png` });

// footer
await desktop.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await desktop.waitForTimeout(1200);
await desktop.screenshot({ path: `${OUT}/13-footer.png` });

// project case study
await desktop.goto(`${BASE}/projects/intelligent-surveillance-system`);
await desktop.waitForTimeout(1800);
await desktop.screenshot({ path: `${OUT}/14-case.png` });
await desktop.getByRole("button", { name: /architecture/i }).click();
await desktop.waitForTimeout(1200);
await desktop.screenshot({ path: `${OUT}/15-case-architecture.png` });

// recruiter
await desktop.goto(`${BASE}/recruiter`);
await desktop.waitForTimeout(1800);
await desktop.screenshot({ path: `${OUT}/16-recruiter.png` });
await desktop.evaluate(() => window.scrollTo(0, 900));
await desktop.waitForTimeout(1200);
await desktop.screenshot({ path: `${OUT}/17-recruiter-scroll.png` });

await desktop.close();

// mobile
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(`${BASE}/`);
await mobile.waitForTimeout(3500);
await mobile.screenshot({ path: `${OUT}/18-mobile-hero.png` });
await mobile.evaluate(() => document.getElementById("work")?.scrollIntoView());
await mobile.waitForTimeout(1500);
await mobile.screenshot({ path: `${OUT}/19-mobile-work.png` });
await mobile.getByRole("button", { name: /open menu/i }).click();
await mobile.waitForTimeout(600);
await mobile.screenshot({ path: `${OUT}/20-mobile-nav.png` });
await mobile.getByRole("button", { name: /close menu/i }).click();
await mobile.evaluate(() => document.getElementById("contact")?.scrollIntoView());
await mobile.waitForTimeout(1500);
await mobile.screenshot({ path: `${OUT}/21-mobile-contact.png` });

await browser.close();
console.log("qa screenshots saved");