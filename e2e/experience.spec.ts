import { expect, test, type Page, type Response } from "@playwright/test";

const apiBase = (process.env.E2E_API_BASE_URL ?? "").replace(/\/$/, "");
const requestTarget = (path: string) => apiBase && (path.startsWith("/api/") || path.startsWith("/static/")) ? `${apiBase}${path}` : path;

async function assertBrowserImagesHealthy(page: Page) {
  const brokenResponses: string[] = [];
  const onResponse = (response: Response) => {
    if (response.request().resourceType() === "image" && response.status() >= 400) brokenResponses.push(`${response.status()} ${response.url()}`);
  };
  page.on("response", onResponse);
  await page.locator("img").evaluateAll((images) => {
    images.forEach((image) => image.scrollIntoView({ block: "center" }));
  });
  await page.waitForTimeout(250);
  const imageStates = await page.locator("img").evaluateAll((images) => images.map((image) => ({ src: image.currentSrc || image.src, naturalWidth: image.naturalWidth })));
  page.off("response", onResponse);
  expect(brokenResponses, "image requests must return a successful HTTP response").toEqual([]);
  expect(imageStates.filter((image) => image.naturalWidth === 0), "rendered images must have a non-zero naturalWidth").toEqual([]);
}

test.describe("public experience", () => {
  test("boots, renders hero and core sections", async ({ page }) => {
    await page.goto("/");
    // The public shell should be usable immediately; data may continue loading.
    await expect(page.getByRole("heading", { name: /harsh/i }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("#about")).toBeAttached();
    await expect(page.locator("#capabilities")).toBeAttached();
    await expect(page.locator("#projects")).toBeAttached();
    await expect(page.locator("#credentials")).toBeAttached();
    await expect(page.locator("#contact")).toBeAttached();
  });

  test("project case study opens with tabs", async ({ page }) => {
    await page.goto("/projects/quantummind");
    await expect(page.getByRole("heading", { name: /QuantumMind/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("tab", { name: /ARCHITECTURE/i }).click();
    await expect(page.locator(".arch-diagram")).toBeVisible();
  });

  test("certificate vault filters and opens viewer", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".vault-grid .vault-item", { timeout: 20000 });
    const before = await page.locator(".vault-grid .vault-item").count();
    expect(before).toBeGreaterThan(0);
    await page.getByRole("button", { name: /View all credentials/i }).click();
    await page.getByRole("button", { name: "Backend", exact: true }).click();
    await expect(page.locator(".vault-count")).toContainText(/credential/i);
    await page.locator(".vault-grid .vault-item").first().click();
    await expect(page.locator(".cert-viewer-body")).toBeVisible();
  });

  test("certificate viewer supports keyboard navigation and restores focus", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /View all credentials/i }).click();
    await page.waitForSelector(".vault-grid .vault-item", { timeout: 20000 });
    const first = page.locator(".vault-grid .vault-item").first();
    await first.click();
    await expect(page.locator(".cert-viewer-body")).toBeVisible();
    await expect(page.locator("body")).toHaveClass(/no-scroll/);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Escape");
    await expect(page.locator(".cert-viewer-body")).toBeHidden();
    await expect(first).toBeFocused();
  });

  test("chatbot answers factual question and admits ignorance", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".chat-fab", { timeout: 20000 });
    await page.locator(".chat-fab").click();
    await page.locator(".chat-input").fill("What is QuantumMind?");
    await page.locator(".chat-send").click();
    await expect(page.locator(".msg-ai .msg-bubble").last()).toContainText(/QuantumMind/i, { timeout: 15000 });

    await page.locator(".chat-input").fill("What is Harsh's salary at Google?");
    await page.locator(".chat-send").click();
    await expect(page.locator(".msg-ai .msg-bubble").last()).toContainText(/don't have verified information/i, { timeout: 15000 });
  });

  test("contact form validates, reports failure, and can retry", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#cf-name", { timeout: 20000 });

    await page.locator("#cf-name").fill("A");
    await page.locator("#cf-email").fill("not-an-email");
    await page.locator("#cf-message").fill("Short");
    await page.locator(".contact-form button[type='submit']").click();
    await expect(page.locator(".form-status.err")).toContainText(/check your name/i);

    const contactEndpoint = apiBase ? `${apiBase}/api/contact` : "**/api/contact";
    await page.route(contactEndpoint, (route) => route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "UNAVAILABLE", message: "Something went wrong. Please try again." }),
    }));
    await page.locator("#cf-name").fill("E2E Recruiter");
    await page.locator("#cf-email").fill(`e2e-${Date.now()}@example.com`);
    await page.locator("#cf-message").fill("This is an automated end-to-end test message.");
    await page.locator(".contact-form button[type='submit']").click();
    await expect(page.locator(".form-status.err")).toContainText(/try again/i);
    await page.unroute(contactEndpoint);

    // The failed request leaves the form intact so a user can correct/retry it.
    await page.locator(".contact-form button[type='submit']").dblclick();
    await expect(page.locator(".form-status.ok")).toBeVisible({ timeout: 10000 });
  });

  test("command palette opens and navigates", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".topbar", { timeout: 20000 });
    await page.keyboard.press("ControlOrMeta+k");
    await expect(page.locator(".palette")).toBeVisible();
    await page.locator(".palette-input").fill("recruiter");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/recruiter/);
    await expect(page.getByRole("heading", { name: /harsh pandey/i })).toBeVisible();
  });

  test("assistant closes with Escape and returns focus", async ({ page }) => {
    await page.goto("/");
    const fab = page.locator(".chat-fab");
    await fab.click();
    await expect(page.locator(".chat-panel")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".chat-panel")).toBeHidden();
    await expect(fab).toBeFocused();
  });

  test("mobile layout stays within the viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /harsh pandey/i }).first()).toBeVisible({ timeout: 15000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    await page.getByRole("button", { name: /^Menu$/ }).click();
    await expect(page.locator(".nav-sheet")).toBeVisible();
    await page.getByRole("button", { name: /^Close$/ }).click();
  });

  test("unknown routes offer a natural way home", async ({ page }) => {
    await page.goto("/not-a-real-page");
    await expect(page.getByText("Page not found")).toBeVisible();
    await page.getByRole("button", { name: /Back to home/i }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("reduced motion keeps the experience lightweight", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /harsh pandey/i }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".hero-core-fallback")).toBeVisible();
  });

  test("homepage has no browser errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /harsh pandey/i }).first()).toBeVisible({ timeout: 15000 });
    expect(errors).toEqual([]);
  });

  test("all shipped and uploaded media resolves in the browser", async ({ page }) => {
    const profileResponse = await page.request.get(requestTarget("/api/profile"));
    expect(profileResponse.ok()).toBe(true);
    const profile = (await profileResponse.json()).profile as { avatarUrl?: string | null; resumeUrl?: string | null };
    for (const url of [profile.avatarUrl, profile.resumeUrl, "/favicon.svg"]) {
      if (!url) continue;
      const response = await page.request.get(requestTarget(url));
      expect(response.status(), `media request failed: ${url}`).toBeLessThan(400);
    }

    const certificateResponse = await page.request.get(requestTarget("/api/certificates?page=1"));
    expect(certificateResponse.ok()).toBe(true);
    const firstPage = await certificateResponse.json() as { certificates: { fileUrl?: string | null }[]; total: number };
    const certificateUrls = firstPage.certificates.map((certificate) => certificate.fileUrl).filter((url): url is string => Boolean(url));
    for (let pageNumber = 2; certificateUrls.length < firstPage.total; pageNumber += 1) {
      const response = await page.request.get(requestTarget(`/api/certificates?page=${pageNumber}`));
      expect(response.ok()).toBe(true);
      const body = await response.json() as { certificates: { fileUrl?: string | null }[] };
      certificateUrls.push(...body.certificates.map((certificate) => certificate.fileUrl).filter((url): url is string => Boolean(url)));
      if (body.certificates.length === 0) break;
    }
    expect(certificateUrls.length).toBe(firstPage.total);
    for (const url of certificateUrls) {
      const response = await page.request.get(requestTarget(url));
      expect(response.status(), `certificate media request failed: ${url}`).toBeLessThan(400);
    }

    await page.goto("/");
    await expect(page.locator("#about img")).toHaveCount(1, { timeout: 15000 });
    await page.getByRole("button", { name: /View all credentials/i }).click();
    await page.waitForSelector(".vault-grid .vault-item", { timeout: 20000 });
    await assertBrowserImagesHealthy(page);

    const projectsResponse = await page.request.get(requestTarget("/api/projects"));
    expect(projectsResponse.ok()).toBe(true);
    const projects = (await projectsResponse.json()).projects as { slug: string; heroImage?: string | null; gallery?: string[] }[];
    for (const project of projects) {
      for (const url of [project.heroImage, ...(project.gallery ?? [])]) {
        if (!url) continue;
        const response = await page.request.get(requestTarget(url));
        expect(response.status(), `project media request failed: ${url}`).toBeLessThan(400);
      }
      await page.goto(`/projects/${project.slug}`);
      await expect(page.locator(".case-hero h1")).toBeVisible({ timeout: 15000 });
      await assertBrowserImagesHealthy(page);
    }

    await page.goto("/recruiter");
    await expect(page.getByRole("heading", { name: /Harsh Pandey/i })).toBeVisible({ timeout: 15000 });
    await assertBrowserImagesHealthy(page);
  });
});

test.describe("security behavior", () => {
  test("private route shows login and rejects bad credentials", async ({ page }) => {
    await page.goto("/private");
    await expect(page.getByText("HARSH // CONTROL")).toBeVisible({ timeout: 15000 });
    await page.locator("#ad-email").fill("admin@harshpandey.dev");
    await page.locator("#ad-password").fill("totally-wrong-password");
    await page.locator(".login-card button[type='submit']").click();
    await expect(page.locator(".private-error")).toBeVisible({ timeout: 10000 });
  });
});
