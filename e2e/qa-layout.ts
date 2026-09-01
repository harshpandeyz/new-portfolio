import { chromium } from "@playwright/test";

const BASE = process.env.QA_BASE ?? "http://localhost:5173";
const browser = await chromium.launch();
const errors = [];

for (const width of [2560, 1440, 1280, 1024, 768, 430, 390, 360]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  const probe = await page.evaluate(() => {
    const r = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const box = el.getBoundingClientRect();
      return [Math.round(box.x), Math.round(box.width), Math.round(box.height)];
    };
    const gc = (sel) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).gridTemplateColumns : null;
    };
    return {
      heroName: r(".hero-name"),
      topbar: r(".topbar"),
      flagshipCopy: r(".flagship-copy"),
      evolution: r(".evolution"),
      workRow: gc(".work-row"),
      techGrid: gc(".tech-grid"),
      vaultGrid: gc(".vault-grid"),
      eduGrid: gc(".edu-grid"),
      contactGrid: gc(".contact-grid"),
      footerInner: gc(".footer-inner"),
      heroOverflowLeft: (() => { const h = r(".hero-name"); return h ? h[0] >= 0 : true; })(),
    };
  });
  console.log(`${width}px overflow=${overflow}`, JSON.stringify(probe));
  if (overflow) errors.push(`horizontal overflow at ${width}px`);
  await page.close();
}

// Interaction surfacing: resize the viewers and confirm usable geometry.
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.locator(".topbar").getByRole("button", { name: /Résumé/ }).click();
await page.waitForSelector(".resume-viewer", { timeout: 10000 });
const res = await page.evaluate(() => {
  const panel = document.querySelector(".resume-viewer");
  const bar = document.querySelector(".resume-viewer-bar");
  const doc = document.querySelector(".resume-viewer-doc");
  const iframe = document.querySelector(".resume-viewer-doc iframe");
  const r = (el) => (el ? { h: Math.round(el.getBoundingClientRect().height), w: Math.round(el.getBoundingClientRect().width) } : null);
  return { panel: r(panel), bar: r(bar), doc: r(doc), iframe: r(iframe), scrollable: doc ? document.querySelector(".resume-viewer").scrollHeight : null };
});
console.log("resume-viewer", JSON.stringify(res));
if (!res.iframe || res.iframe.h < 600) errors.push("resume iframe too small");
await page.keyboard.press("Escape");

await page.goto(`${BASE}/credentials`, { waitUntil: "networkidle" });
await page.getByRole("group", { name: "Credential categories" }).waitFor();
await page.locator(".vault-item .vault-open").first().click();
await page.waitForSelector(".credential-viewer", { timeout: 10000 });
const cred = await page.evaluate(() => {
  const panel = document.querySelector(".credential-viewer");
  const bar = document.querySelector(".credential-viewer-bar");
  const frame = document.querySelector(".credential-viewer-frame");
  const info = document.querySelector(".credential-viewer-info");
  const r = (el) => (el ? { h: Math.round(el.getBoundingClientRect().height), w: Math.round(el.getBoundingClientRect().width) } : null);
  return { panel: r(panel), bar: r(bar), frame: r(frame), info: r(info) };
});
console.log("credential-viewer", JSON.stringify(cred));
if (!cred.frame || cred.frame.h < 400) errors.push("credential frame too small");

// mobile nav sheet dimensions
const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
await m.goto(`${BASE}/`, { waitUntil: "networkidle" });
await m.getByRole("button", { name: /open menu/i }).click();
await m.waitForTimeout(500);
const sheet = await m.evaluate(() => {
  const el = document.querySelector(".nav-sheet");
  const r = el.getBoundingClientRect();
  return { h: Math.round(r.height), w: Math.round(r.width), bottom: Math.round(r.bottom), innerH: innerHeight };
});
console.log("mobile-sheet", JSON.stringify(sheet));
if (sheet.bottom > sheet.innerH + 2) errors.push("mobile nav sheet overflows viewport");

console.log(errors.length ? `LAYOUT ISSUES: ${errors.join("; ")}` : "NO LAYOUT ISSUES");
await browser.close();