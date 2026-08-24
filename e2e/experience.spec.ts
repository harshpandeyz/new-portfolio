import { expect, test } from "@playwright/test";

test.describe("public experience", () => {
  test("boots, renders hero and core sections", async ({ page }) => {
    await page.goto("/");
    // boot sequence completes (or is skipped)
    await expect(page.getByRole("heading", { name: /harsh/i }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("#identity")).toBeAttached();
    await expect(page.locator("#core")).toBeAttached();
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
    await page.getByRole("tab", { name: "BACKEND", exact: true }).click();
    await expect(page.locator(".vault-count")).toContainText(/RECORD/i);
    await page.locator(".vault-grid .vault-item").first().click();
    await expect(page.locator(".cert-viewer-body")).toBeVisible();
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

  test("contact form validates and submits", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#cf-name", { timeout: 20000 });
    await page.locator("#cf-name").fill("E2E Recruiter");
    await page.locator("#cf-email").fill("e2e-recruiter@example.com");
    await page.locator("#cf-message").fill("This is an automated end-to-end test message.");
    await page.locator(".contact-form button[type='submit']").click();
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
