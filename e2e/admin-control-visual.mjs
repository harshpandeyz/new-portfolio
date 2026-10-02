import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const output = "test-results/admin-after";
mkdirSync(output, { recursive: true });
const env = Object.fromEntries(readFileSync(".env", "utf8").split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)=(.*)\s*$/);
  if (!match) return [];
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return [[match[1], value]];
}));
const email = process.env.E2E_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL ?? env.ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? env.ADMIN_PASSWORD;
if (!password) throw new Error("Admin screenshot pass requires ADMIN_PASSWORD in the local environment.");

const sizes = [
  ["desktop", 1440, 900], ["laptop", 1280, 800], ["tablet", 768, 1024],
  ["mobile", 390, 844], ["narrow", 320, 760],
];
const routes = [
  ["overview", "/private", "Overview"], ["projects", "/private/projects", "Projects"],
  ["certificates", "/private/certificates", "Certificates"], ["skills", "/private/skills", "Skills"],
  ["timeline", "/private/timeline", "Timeline"], ["education", "/private/education", "Education"],
  ["profile", "/private/profile", "Profile"], ["media", "/private/media", "Media library"],
  ["messages", "/private/messages", "Messages"], ["ai-providers", "/private/ai-providers", "AI providers"],
  ["security", "/private/security", "Security"], ["settings", "/private/settings", "Settings"],
  ["audit", "/private/audit", "Audit log"],
];
const browser = await chromium.launch();
const errors = [];

// Preserve the unauthenticated login frame.
const anonymous = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await anonymous.addInitScript(() => {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("/api/auth/me")) return new Promise((resolve) => window.setTimeout(() => resolve(originalFetch(input, init)), 1200));
    return originalFetch(input, init);
  };
});
await anonymous.goto(`${base}/private`, { waitUntil: "domcontentloaded" });
await anonymous.waitForTimeout(120);
await anonymous.screenshot({ path: `${output}/session-loading.png` });
await anonymous.waitForSelector(".ctl-login-card", { timeout: 15000 });
await anonymous.screenshot({ path: `${output}/login-1440.png` });
await anonymous.setViewportSize({ width: 390, height: 844 });
await anonymous.screenshot({ path: `${output}/login-mobile.png` });
await anonymous.setViewportSize({ width: 1440, height: 900 });
await anonymous.route("**/api/auth/login", (route) => route.fulfill({
  status: 401,
  contentType: "application/json",
  body: JSON.stringify({ error: "INVALID_CREDENTIALS", message: "Invalid email or password" }),
}));
await anonymous.locator("#ctl-email").fill("wrong@example.invalid");
await anonymous.locator("#ctl-password").fill("incorrect-password");
await anonymous.getByRole("button", { name: "Sign in" }).click();
await anonymous.getByRole("alert").waitFor({ timeout: 10000 });
await anonymous.screenshot({ path: `${output}/login-error.png` });
await anonymous.unroute("**/api/auth/login");

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
let expectedProjectOutage = false;
let expectedMediaFailure = false;
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() !== "error" || /401|Unauthorized/i.test(message.text())) return;
  if (expectedProjectOutage && /503|Service unavailable/i.test(message.text())) return;
  if (expectedMediaFailure && /500|Internal Server Error/i.test(message.text())) return;
  errors.push(`console: ${message.text()}`);
});
await page.goto(`${base}/private`);
await page.locator("#ctl-email").fill(email);
await page.locator("#ctl-password").fill(password);
await page.getByRole("button", { name: "Sign in" }).click();
const signedIn = await page.waitForSelector(".ctl-shell", { timeout: 10000 }).then(() => true).catch(() => false);
if (!signedIn) {
  await page.screenshot({ path: `${output}/login-error.png` });
  const needsCode = await page.locator("#ctl-code").isVisible().catch(() => false);
  throw new Error(`Admin screenshot login did not complete${needsCode ? ": account requests a 2FA code" : "; credentials may not match the local admin account"}.`);
}
await page.waitForTimeout(250);

const layout = [];
for (const [routeName, url, heading] of routes) {
  for (const [sizeName, width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.goto(`${base}${url}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: heading, exact: true }).waitFor({ timeout: 15000 }).catch(() => undefined);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${output}/${routeName}-${sizeName}.png` });
    const metrics = await page.evaluate(() => ({
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      shell: Math.round(document.querySelector(".ctl-shell")?.getBoundingClientRect().width ?? 0),
      main: Math.round(document.querySelector(".ctl-main")?.getBoundingClientRect().width ?? 0),
      h1: document.querySelector(".ctl-pagehead h1")?.textContent?.trim() ?? null,
    }));
    layout.push({ route: routeName, size: sizeName, ...metrics });
  }
}

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${base}/private/projects`);
await page.getByRole("heading", { name: "Projects", exact: true }).waitFor();
await page.waitForTimeout(200);
await page.locator(".ctl-project-card .ctl-project-card-foot .ctl-btn").first().click();
await page.waitForSelector(".ctl-editor[role='dialog']");
await page.screenshot({ path: `${output}/project-editor.png` });
await page.keyboard.press("Escape");

await page.locator(".ctl-project-card .ctl-overflow-menu summary").first().click();
await page.getByRole("button", { name: "Delete project", exact: true }).click();
await page.getByRole("dialog", { name: /Delete/ }).waitFor();
await page.screenshot({ path: `${output}/project-delete-confirmation.png` });
await page.keyboard.press("Escape");

await page.goto(`${base}/private/certificates`);
await page.getByRole("heading", { name: "Certificates", exact: true }).waitFor();
await page.getByRole("button", { name: /new certificate/i }).click();
await page.waitForSelector(".ctl-editor[role='dialog']");
await page.screenshot({ path: `${output}/certificate-editor.png` });
await page.keyboard.press("Escape");

await page.goto(`${base}/private/projects`);
await page.locator('input[aria-label="Search projects"]').fill("no matching project in this audit");
await page.waitForTimeout(450);
await page.screenshot({ path: `${output}/projects-empty.png` });
await page.locator(".ctl-empty button").click();
await page.waitForTimeout(400);

expectedProjectOutage = true;
await page.route("**/api/projects/admin*", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "UNAVAILABLE", message: "Temporarily unavailable" }) }));
await page.goto(`${base}/private/projects`);
await page.getByText(/temporarily unavailable/i).waitFor({ timeout: 10000 }).catch(() => undefined);
await page.waitForTimeout(150);
await page.screenshot({ path: `${output}/projects-error.png` });
await page.unroute("**/api/projects/admin*");
expectedProjectOutage = false;

expectedMediaFailure = true;
let uploadAttempts = 0;
await page.route("**/api/media", (route) => {
  if (route.request().method() !== "POST") return route.continue();
  uploadAttempts += 1;
  if (uploadAttempts === 1) {
    return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "UNAVAILABLE", message: "Upload could not finish" }) });
  }
  return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ asset: { filename: "retry-audit.png" } }) });
});
await page.goto(`${base}/private/media`);
await page.locator("#ctl-media-upload").setInputFiles({
  name: "retry-audit.png",
  mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
});
await page.getByRole("button", { name: "Retry", exact: true }).waitFor({ timeout: 10000 });
await page.screenshot({ path: `${output}/upload-failed-retry.png` });
await page.getByRole("button", { name: "Retry", exact: true }).click();
await page.getByText("Uploaded", { exact: true }).waitFor({ timeout: 10000 });
await page.screenshot({ path: `${output}/upload-recovered.png` });
await page.unroute("**/api/media");
expectedMediaFailure = false;

await page.goto(`${base}/private/messages`);
await page.getByRole("heading", { name: "Messages", exact: true }).waitFor();
const firstMessage = page.locator(".ctl-msg-open").first();
await firstMessage.waitFor({ timeout: 8000 }).catch(() => undefined);
if (await firstMessage.count()) {
  await firstMessage.click();
  await page.locator(".ctl-reply").waitFor({ timeout: 10000 });
  await page.getByRole("textbox", { name: "Message", exact: true }).fill("Reply preview only — not sent.");
  await page.screenshot({ path: `${output}/conversation-reply.png` });
} else await page.screenshot({ path: `${output}/conversation-empty.png` });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${base}/private/messages`);
const mobileMessage = page.locator(".ctl-msg-open").first();
await mobileMessage.waitFor({ timeout: 8000 }).catch(() => undefined);
if (await mobileMessage.count()) {
  await mobileMessage.click();
  await page.locator(".ctl-detail.open").waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${output}/conversation-mobile.png` });
}

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${base}/private/security`);
await page.getByRole("heading", { name: "Security", exact: true }).waitFor();
await page.locator(".ctl-session-row").first().waitFor({ timeout: 8000 }).catch(() => undefined);
if (await page.locator(".ctl-session-row").count()) {
  const disclosure = page.locator(".ctl-session-details").first();
  await disclosure.locator("summary").click();
  await page.screenshot({ path: `${output}/security-session-details.png`, fullPage: true });
}

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${base}/private`);
await page.getByRole("button", { name: "Open navigation" }).click();
await page.waitForSelector(".ctl-drawer[role='dialog']");
await page.screenshot({ path: `${output}/mobile-navigation.png` });
await page.keyboard.press("Escape");

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${base}/private`);
await page.getByRole("button", { name: "Open command palette" }).click();
await page.waitForSelector(".ctl-palette[role='dialog']");
await page.screenshot({ path: `${output}/command-palette.png` });
await page.keyboard.press("Escape");

writeFileSync(`${output}/audit.json`, JSON.stringify({ sizes, routes: routes.map(([name, path]) => ({ name, path })), layout, errors }, null, 2));
console.log(`Captured ${layout.length} route and viewport screenshots with ${errors.length} browser errors.`);
console.log(`Viewport overflows: ${layout.filter((row) => row.documentWidth > row.viewport + 1).map((row) => `${row.route}/${row.size}(${row.documentWidth}>${row.viewport})`).join(", ") || "none"}`);
await browser.close();
