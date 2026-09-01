// Standalone visual capture for redesign progress shots (Plain JS, not tsx).
import { chromium } from "@playwright/test";

const BASE = process.env.QA_BASE || "http://localhost:5173";
const OUT = process.env.QA_OUT || "test-results/qa";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(`${BASE}/`);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${OUT}/01-hero.png` });

  await page.evaluate(() => document.getElementById("about").scrollIntoView());
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}/02-about.png` });

  await page.evaluate(() => document.getElementById("journey").scrollIntoView());
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}/03-journey.png` });

  await page.evaluate(() => document.getElementById("work").scrollIntoView());
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}/04-work.png` });

  await page.evaluate(() => document.getElementById("tech").scrollIntoView());
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}/05-tech.png` });

  await page.evaluate(() => document.getElementById("credentials").scrollIntoView());
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}/06-credentials.png` });

  await page.evaluate(() => document.getElementById("contact").scrollIntoView());
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}/10-contact.png` });

  await page.evaluate(() => document.getElementById("exit").scrollIntoView());
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}/12-closing.png` });

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/13-footer.png` });

  await page.keyboard.press("ControlOrMeta+k");
  await page.waitForSelector(".palette", { timeout: 5000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/palette.png` });
  await page.keyboard.press("Escape");

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(`${BASE}/`);
  await mobile.waitForTimeout(4000);
  await mobile.screenshot({ path: `${OUT}/18-mobile-hero.png` });
  await mobile.evaluate(() => document.getElementById("work").scrollIntoView());
  await mobile.waitForTimeout(1600);
  await mobile.screenshot({ path: `${OUT}/19-mobile-work.png` });

  await browser.close();
  console.log("captures saved");
})();