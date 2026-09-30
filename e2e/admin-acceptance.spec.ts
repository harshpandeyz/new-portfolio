import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL ?? "admin@harshpandey.dev";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD;

async function signIn(page: Page) {
  if (!ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD or E2E_ADMIN_PASSWORD is required for admin acceptance tests");
  await page.goto("/private");
  await page.locator("#ctl-email").fill(ADMIN_EMAIL);
  await page.locator("#ctl-password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator(".ctl-shell")).toBeVisible({ timeout: 15000 });
}

async function csrf(page: Page): Promise<string> {
  const response = await page.request.get("/api/auth/csrf");
  expect(response.ok()).toBe(true);
  return (await response.json()).csrfToken as string;
}

async function mutate(page: Page, method: string, path: string, data?: unknown) {
  const headers: Record<string, string> = { "x-csrf-token": await csrf(page) };
  if (data !== undefined) headers["content-type"] = "application/json";
  return page.request.fetch(path, {
    method,
    headers,
    ...(data === undefined ? {} : { data }),
  });
}

async function json<T>(response: Awaited<ReturnType<APIRequestContext["get"]>>): Promise<T> {
  expect(response.ok(), await response.text()).toBe(true);
  return response.json() as Promise<T>;
}

test.describe("admin release acceptance", () => {
  test("auth, CMS mutations, public reflection, media, settings and audit", async ({ page, request }) => {
    test.setTimeout(120000);
    await signIn(page);
    page.setDefaultTimeout(10000);
    page.setDefaultNavigationTimeout(15000);
    await expect(page.locator('.ctl-crumbs [aria-current="page"]')).toHaveText("Overview");

    // Server-side authorization must hold independently of the private UI.
    const unauthorized = await request.post("/api/projects", { data: { title: "Unauthorised" } });
    expect(unauthorized.status()).toBe(401);
    expect((await request.get("/api/projects/admin")).status()).toBe(401);

    const originalProfile = (await json<{ profile: Record<string, unknown> }>(await page.request.get("/api/profile"))).profile;
    const originalSettings = (await json<{ settings: Record<string, boolean> }>(await page.request.get("/api/settings"))).settings;
    const stamp = Date.now();
    const slug = `e2e-release-${stamp}`;
    let projectId: string | undefined;
    let certificateId: string | undefined;
    let skillId: string | undefined;
    let educationId: string | undefined;
    let timelineId: string | undefined;
    let mediaId: string | undefined;
    let certificateMediaId: string | undefined;
    let messageId: string | undefined;
    let pendingTwoFactorSetup = false;

    try {
      for (const [path, heading] of [
        ["/private/projects", "Projects"], ["/private/certificates", "Certificates"],
        ["/private/skills", "Skills"], ["/private/education", "Education"],
        ["/private/timeline", "Timeline"], ["/private/profile", "Profile"],
        ["/private/media", "Media library"], ["/private/messages", "Messages"],
        ["/private/security", "Security"], ["/private/settings", "Settings"],
        ["/private/audit", "Audit log"],
      ] as const) {
        await page.goto(path);
        await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible({ timeout: 15000 });
      }

      // Exercise the real enrollment wizard without enabling 2FA on the test account.
      await page.goto("/private/security");
      await page.getByRole("button", { name: "Start setup" }).click();
      pendingTwoFactorSetup = true;
      await expect(page.getByRole("textbox", { name: "Manual entry secret" })).toBeVisible();
      await page.screenshot({
        path: "test-results/admin-security-2fa-scan.png",
        mask: [page.locator(".ctl-sec-qr"), page.locator("input[readonly]")],
      });
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.getByRole("textbox", { name: "6-digit code from your app" })).toBeVisible();
      await page.screenshot({ path: "test-results/admin-security-2fa-verify.png" });
      await page.getByRole("button", { name: "Cancel setup" }).click();
      await expect(page.getByRole("button", { name: "Start setup" })).toBeVisible();
      pendingTwoFactorSetup = false;
      expect((await page.request.get("/api/auth/2fa/status")).status()).toBe(200);

      // Profile edits publish immediately and remain database-backed.
      const profileEdit = {
        ...originalProfile,
        headline: `${String(originalProfile.headline)} · E2E verified`,
      };
      expect((await mutate(page, "PATCH", "/api/profile", profileEdit)).ok()).toBe(true);
      const publicProfile = await json<{ profile: { headline: string } }>(await page.request.get("/api/profile"));
      expect(publicProfile.profile.headline).toContain("E2E verified");
      await expect(page.goto("/"), "public route must load after profile mutation").resolves.toBeTruthy();

      const createdProject = await json<{ project: { id: string; slug: string } }>(await mutate(page, "POST", "/api/projects", {
        title: "E2E Release Project", slug, shortDescription: "Temporary release acceptance project", category: "TEST",
        tier: "experiment", status: "draft", featured: true, year: "2026", order: 0, stack: ["Playwright"],
        decisions: [], dataFlow: [], gallery: [],
      }));
      projectId = createdProject.project.id;
      await page.goto("/private/projects");
      await expect(page.getByRole("button", { name: "E2E Release Project" })).toBeVisible();
      const homepageSlots = page.locator(".ctl-curation-slot");
      await expect(homepageSlots.nth(0)).toContainText("Intelligent Surveillance System · CCTV-X");
      await expect(homepageSlots.nth(1)).toContainText("OrchestraAI");
      await expect(homepageSlots.nth(2)).toContainText("QuantumMind");
      await expect(homepageSlots.nth(3)).toContainText("SkillMatch");
      expect((await page.request.get(`/api/projects/${slug}`)).status()).toBe(404);
      expect((await mutate(page, "POST", "/api/projects", {
        title: "Duplicate", slug, shortDescription: "Duplicate", category: "TEST", tier: "experiment", status: "draft", featured: false, year: "2026", order: 1, stack: [],
      })).status()).toBe(409);
      await json(await mutate(page, "PATCH", `/api/projects/${projectId}`, { status: "complete", featured: true, order: 0 }));
      expect((await page.request.get(`/api/projects/${slug}`)).status()).toBe(200);
      await page.goto(`/projects/${slug}`);
      await expect(page.getByRole("heading", { name: "E2E Release Project" })).toBeVisible();
      await page.goto("/private/projects");
      for (const [index, title] of [
        [0, "Intelligent Surveillance System · CCTV-X"], [1, "OrchestraAI"],
        [2, "QuantumMind"], [3, "SkillMatch"],
      ] as const) {
        await expect(page.locator(".ctl-curation-slot").nth(index)).toContainText(title);
      }
      await json(await mutate(page, "PATCH", `/api/projects/${projectId}`, { status: "archived", featured: false, order: 999 }));

      const createdSkill = await json<{ skill: { id: string } }>(await mutate(page, "POST", "/api/skills", {
        name: `E2E Skill ${stamp}`, category: "BACKEND", level: "working", description: "Temporary acceptance capability", usedIn: [slug], relatedConcepts: [], featured: false, order: 999,
      }));
      skillId = createdSkill.skill.id;
      expect((await page.request.get("/api/skills")).text()).resolves.toContain(`E2E Skill ${stamp}`);
      await json(await mutate(page, "PATCH", `/api/skills/${skillId}`, { level: "core" }));

      const createdCertificate = await json<{ certificate: { id: string } }>(await mutate(page, "POST", "/api/certificates", {
        title: `E2E Certificate ${stamp}`, issuer: "Release Acceptance", issuedOn: "2026-09-07", category: "DEVELOPMENT", credentialId: `E2E-${stamp}`, featured: false, order: 999,
      }));
      certificateId = createdCertificate.certificate.id;
      const certificateUpload = await page.request.post("/api/media", { headers: { "x-csrf-token": await csrf(page) }, multipart: { file: { name: "e2e-certificate.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") } } });
      const certificateAsset = await json<{ asset: { id: string; url: string } }>(certificateUpload);
      certificateMediaId = certificateAsset.asset.id;
      await json(await mutate(page, "PATCH", `/api/certificates/${certificateId}`, { featured: true, fileUrl: certificateAsset.asset.url }));
      expect((await page.request.get("/api/certificates?search=E2E%20Certificate")).text()).resolves.toContain("E2E Certificate");
      await json(await mutate(page, "PATCH", `/api/certificates/${certificateId}`, { featured: true }));

      const createdEducation = await json<{ item: { id: string } }>(await mutate(page, "POST", "/api/education", {
        degree: "E2E Degree", institution: "Release Acceptance", field: "Testing", startYear: "2026", endYear: null, grade: null, description: "Temporary acceptance record", order: 999,
      }));
      educationId = createdEducation.item.id;
      expect((await page.request.get("/api/education")).text()).resolves.toContain("E2E Degree");

      const createdTimeline = await json<{ item: { id: string } }>(await mutate(page, "POST", "/api/timeline", {
        date: "2026", endDate: null, title: "E2E Release Check", organization: "Release Acceptance", description: "Temporary acceptance milestone", type: "milestone", order: 999,
      }));
      timelineId = createdTimeline.item.id;
      expect((await page.request.get("/api/timeline")).text()).resolves.toContain("E2E Release Check");

      // Contact inbox, status transition, analytics and audit visibility.
      const contact = await page.request.post("/api/contact", { data: { name: "E2E Recruiter", email: `e2e-${stamp}@example.com`, subject: "[E2E] release", message: "This message is created only for release acceptance." } });
      const contactBody = await json<{ id: string }>(contact);
      messageId = contactBody.id;
      const inbox = await json<{ messages: { id: string }[] }>(await page.request.get("/api/contact?status=NEW"));
      expect(inbox.messages.some((message) => message.id === messageId)).toBe(true);
      await page.goto(`/private/messages?open=${messageId}`);
      await expect(page.getByRole("textbox", { name: "Message", exact: true })).toBeVisible();
      await json(await mutate(page, "PATCH", `/api/contact/${messageId}/status`, { status: "READ" }));
      await json(await mutate(page, "POST", "/api/events", { type: "page_view", ref: "e2e-release" }));
      expect((await page.request.get("/api/events/summary")).status()).toBe(200);

      // Upload, signature verification, replacement and orphan detection.
      const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
      const upload = await page.request.post("/api/media", { headers: { "x-csrf-token": await csrf(page) }, multipart: { file: { name: "e2e-release.png", mimeType: "image/png", buffer: png } } });
      const uploaded = await json<{ asset: { id: string; url: string; referenced: boolean } }>(upload);
      mediaId = uploaded.asset.id;
      expect(uploaded.asset.referenced).toBe(false);
      expect((await page.request.get(uploaded.asset.url)).status()).toBe(200);
      const replacement = await page.request.post(`/api/media/${mediaId}/replace`, { headers: { "x-csrf-token": await csrf(page) }, multipart: { file: { name: "e2e-release-replaced.png", mimeType: "image/png", buffer: png } } });
      expect(replacement.status()).toBe(200);
      const removedMedia = await mutate(page, "DELETE", `/api/media/${mediaId}`);
      expect(removedMedia.status(), await removedMedia.text()).toBe(200);
      mediaId = undefined;

      const changedSettings = { ...originalSettings, chatEnabled: false, contactEnabled: false, analyticsEnabled: false, maintenanceMode: true };
      expect((await mutate(page, "PATCH", "/api/settings", changedSettings)).status()).toBe(200);
      const publicSettings = await json<{ settings: { chatEnabled: boolean; contactEnabled: boolean; maintenanceMode: boolean } }>(await page.request.get("/api/settings/public"));
      expect(publicSettings.settings).toMatchObject({ chatEnabled: false, contactEnabled: false, maintenanceMode: true });
      expect((await page.request.post("/api/chat", { data: { message: "status" } })).status()).toBe(503);
      expect((await page.request.post("/api/contact", { data: { name: "Disabled", email: `disabled-${stamp}@example.com`, message: "This must not be stored." } })).status()).toBe(503);
      expect((await page.request.post("/api/events", { data: { type: "page_view" } })).status()).toBe(202);
      await page.goto("/");
      await expect(page.locator(".maintenance-notice")).toBeVisible();
      await expect(page.locator(".chat-fab")).toHaveCount(0);

      const audit = await json<{ logs: { action: string }[] }>(await page.request.get("/api/stats/audit?page=1&pageSize=100"));
      expect(audit.logs.some((log) => log.action === "MEDIA_REPLACED")).toBe(true);
      expect(audit.logs.some((log) => log.action === "SETTINGS_UPDATED")).toBe(true);
    } finally {
      // Restore live settings/profile and remove every temporary record even
      // when an assertion fails midway through this acceptance test.
      if (pendingTwoFactorSetup) await mutate(page, "POST", "/api/auth/2fa/setup/cancel", {}).catch(() => undefined);
      await mutate(page, "PATCH", "/api/settings", originalSettings).catch(() => undefined);
      await mutate(page, "PATCH", "/api/profile", originalProfile).catch(() => undefined);
      for (const [path, id] of [["/api/projects", projectId], ["/api/certificates", certificateId], ["/api/skills", skillId], ["/api/education", educationId], ["/api/timeline", timelineId], ["/api/media", mediaId]] as const) {
        if (id) await mutate(page, "DELETE", `${path}/${id}`).catch(() => undefined);
      }
      if (certificateMediaId) await mutate(page, "DELETE", `/api/media/${certificateMediaId}`).catch(() => undefined);
      if (messageId) await mutate(page, "DELETE", `/api/contact/${messageId}`).catch(() => undefined);
    }

    await page.goto("/private");
    await expect(page.locator(".ctl-shell")).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("dialog", { name: "Control navigation" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Control navigation" })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
    await page.getByRole("button", { name: /^Account:/ }).click();
    await page.getByRole("menu", { name: "Account" }).getByRole("menuitem", { name: "Log out" }).click();
    await expect(page.locator(".ctl-login-card")).toBeVisible();
    await signIn(page);
    const sessions = await json<{ sessions: { id: string; current: boolean }[] }>(await page.request.get("/api/auth/sessions"));
    const current = sessions.sessions.find((session) => session.current);
    expect(current).toBeTruthy();
    expect((await mutate(page, "DELETE", `/api/auth/sessions/${current!.id}`)).status()).toBe(200);
    expect((await page.request.get("/api/auth/me")).status()).toBe(401);
  });
});
