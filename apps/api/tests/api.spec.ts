/**
 * HP//OS API security & behavior suite.
 * Run: npm run test:api  (requires TEST_DATABASE_URL, see global-setup)
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

import { buildApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { resetRateLimits } from "../src/utils/rate-limit.js";

let app: FastifyInstance;
const ADMIN = { email: "admin@harshpandey.dev", password: "test-admin-password-123" };

async function login(): Promise<{ cookies: Record<string, string>; csrf: string }> {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: ADMIN,
  });
  expect(res.statusCode).toBe(200);
  const cookies: Record<string, string> = {};
  for (const c of res.cookies) cookies[c.name] = c.value;
  return { cookies, csrf: cookies["hp_csrf"]! };
}

function authHeaders(csrf: string): Record<string, string> {
  return { "x-csrf-token": csrf };
}

beforeAll(async () => {
  process.env.TEST_MODE = "1";
  app = await buildApp();
  // ensure admin exists
  const { bcryptHash } = await import("../src/modules/auth/password.js");
  await prisma.user.upsert({
    where: { email: ADMIN.email },
    update: { passwordHash: await bcryptHash(ADMIN.password) },
    create: { email: ADMIN.email, passwordHash: await bcryptHash(ADMIN.password), role: "ADMIN" },
  });
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

beforeEach(() => {
  resetRateLimits();
});

describe("health", () => {
  it("reports system online", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "ok" });
  });

  it("reports readiness with DB check", async () => {
    const res = await app.inject({ method: "GET", url: "/api/ready" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "ready" });
  });
});

describe("analytics summaries", () => {
  it("counts page views separately and returns the requested daily range", async () => {
    const { cookies } = await login();
    await prisma.analyticsEvent.deleteMany();
    const dayMs = 24 * 60 * 60 * 1000;
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
    const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 6 * dayMs);
    const previousSince = new Date(since.getTime() - 7 * dayMs);
    await prisma.analyticsEvent.createMany({
      data: [
        { type: "page_view", ref: "analytics-home", createdAt: today },
        { type: "project_view", ref: "analytics-project", createdAt: today },
        { type: "contact_submit", ref: "analytics-contact", createdAt: today },
        { type: "page_view", ref: "analytics-previous", createdAt: new Date(since.getTime() - dayMs) },
        { type: "page_view", ref: "analytics-outside", createdAt: new Date(previousSince.getTime() - 1) },
      ],
    });

    const summary = await app.inject({ method: "GET", url: "/api/events/summary?days=7", cookies });
    expect(summary.statusCode).toBe(200);
    const body = summary.json() as {
      days: number;
      daily: { day: string; count: number }[];
      eventCounts: { type: string; count: number }[];
      previousEventCounts: { type: string; count: number }[];
      projectPerformance: { slug: string; title: string; count: number }[];
    };
    expect(body.days).toBe(7);
    expect(body.daily).toHaveLength(7);
    expect(body.daily.reduce((sum, day) => sum + day.count, 0)).toBe(1);
    expect(body.eventCounts).toEqual(expect.arrayContaining([
      { type: "page_view", count: 1 },
      { type: "project_view", count: 1 },
      { type: "contact_submit", count: 1 },
    ]));
    expect(body.previousEventCounts).toContainEqual({ type: "page_view", count: 1 });
    expect(body.projectPerformance).toContainEqual({ slug: "analytics-project", title: "analytics-project", count: 1 });
    expect((await app.inject({ method: "GET", url: "/api/events/summary?days=14", cookies })).statusCode).toBe(400);
    await prisma.analyticsEvent.deleteMany();
  });
});

describe("authentication", () => {
  it("rejects bad credentials without user enumeration", async () => {
    const wrongPass = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: ADMIN.email, password: "definitely-wrong-pass" } });
    const wrongUser = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "nobody@nowhere.io", password: "definitely-wrong-pass" } });
    expect(wrongPass.statusCode).toBe(401);
    expect(wrongUser.statusCode).toBe(401);
    expect(wrongPass.body).toBe(wrongUser.body); // identical error shape
  });

  it("rate limits brute-force login attempts", async () => {
    const attempts = await Promise.all(
      Array.from({ length: 10 }, () =>
        app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "bf@test.io", password: "wrong-password-x" } }),
      ),
    );
    const codes = attempts.map((r) => r.statusCode);
    expect(codes.filter((c) => c === 429).length).toBeGreaterThan(0);
  });

  it("a spoofed X-Forwarded-For header cannot rotate the rate-limit identity", async () => {
    // Trust proxy is configured to a bounded hop count, so client-supplied
    // X-Forwarded-For values must be ignored. Rotating the header must NOT
    // bypass the login brute-force limit.
    const codes: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: "spoof@test.io", password: "wrong-password-x" },
        headers: { "x-forwarded-for": `203.0.113.${i}` },
      });
      codes.push(res.statusCode);
    }
    // The first requests share one bucket (limit 8), so the 9th+ must be 429
    // even though each carried a different spoofed X-Forwarded-For.
    expect(codes.filter((c) => c === 429).length).toBeGreaterThanOrEqual(4);
    expect(codes.slice(0, 2).every((c) => c === 401)).toBe(true);
  });

  it("rejects malformed login payloads", async () => {
    const res = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "not-an-email", password: "x" } });
    expect(res.statusCode).toBe(400);
  });

  it("/api/auth/me requires a session", async () => {
    const res = await app.inject({ method: "GET", url: "/api/auth/me" });
    expect(res.statusCode).toBe(401);
  });

  it("logout destroys the session server-side", async () => {
    const { cookies } = await login();
    await app.inject({ method: "POST", url: "/api/auth/logout", cookies, headers: authHeaders(cookies["hp_csrf"]!) });
    const me = await app.inject({ method: "GET", url: "/api/auth/me", cookies });
    expect(me.statusCode).toBe(401);
  });

  it("returns a fresh CSRF token for an existing cross-origin SPA session", async () => {
    const { cookies } = await login();
    const res = await app.inject({ method: "GET", url: "/api/auth/csrf", cookies });
    expect(res.statusCode).toBe(200);
    expect(res.json().csrfToken).toMatch(/^[a-f0-9]+\.[a-f0-9]+$/);
    expect(res.cookies.some((cookie) => cookie.name === "hp_csrf")).toBe(true);
  });
});

describe("admin authorization (CRUD cannot be bypassed)", () => {
  it("unauthenticated user cannot create a project", async () => {
    const res = await app.inject({ method: "POST", url: "/api/projects", payload: { title: "Hack" } });
    expect(res.statusCode).toBe(401);
  });

  it("unauthenticated user cannot delete a project", async () => {
    const res = await app.inject({ method: "DELETE", url: "/api/projects/some-id" });
    expect(res.statusCode).toBe(401);
  });

  it("authenticated mutation without CSRF token is rejected", async () => {
    const { cookies } = await login();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      cookies,
      payload: { title: "No CSRF" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("CSRF");
  });

  it("forged CSRF token is rejected", async () => {
    const { cookies } = await login();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      cookies,
      headers: { "x-csrf-token": "forged.abc" },
      payload: { title: "Forge" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("admin can create, update and delete a project with valid CSRF", async () => {
    const { cookies, csrf } = await login();
    const create = await app.inject({
      method: "POST",
      url: "/api/projects",
      cookies,
      headers: authHeaders(csrf),
      payload: {
        title: "Test System",
        slug: "test-system-x",
        shortDescription: "A temporary test system",
        category: "TEST",
        tier: "experiment",
        status: "draft",
        featured: false,
        year: "2026",
        order: 999,
        stack: ["Vitest"],
      },
    });
    expect(create.statusCode).toBe(201);
    const project = create.json().project;
    expect(project.slug).toBe("test-system-x");

    // draft must be hidden from public API
    const publicList = await app.inject({ method: "GET", url: "/api/projects" });
    expect(publicList.json().projects.some((p: { slug: string }) => p.slug === "test-system-x")).toBe(false);
    const publicGet = await app.inject({ method: "GET", url: "/api/projects/test-system-x" });
    expect(publicGet.statusCode).toBe(404);

    const update = await app.inject({
      method: "PATCH",
      url: `/api/projects/${project.id}`,
      cookies,
      headers: authHeaders(csrf),
      payload: { status: "complete" },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().project.status).toBe("complete");

    // now publicly visible
    const publicGet2 = await app.inject({ method: "GET", url: "/api/projects/test-system-x" });
    expect(publicGet2.statusCode).toBe(200);

    const del = await app.inject({ method: "DELETE", url: `/api/projects/${project.id}`, cookies, headers: authHeaders(csrf) });
    expect(del.statusCode).toBe(200);
  });

  it("rejects invalid project payloads with field-level details", async () => {
    const { cookies, csrf } = await login();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      cookies,
      headers: authHeaders(csrf),
      payload: { title: "x", slug: "Bad Slug!", tier: "not-a-tier" },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(body.details.issues.length).toBeGreaterThan(0);
  });

  it("slug conflicts return 409", async () => {
    const { cookies, csrf } = await login();
    const existing = await prisma.project.findFirst();
    if (!existing) return; // seed not present in this test db
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      cookies,
      headers: authHeaders(csrf),
      payload: {
        title: "Dup", slug: existing.slug, shortDescription: "dup", category: "TEST",
        tier: "experiment", status: "draft", featured: false, year: "2026", order: 1, stack: [],
      },
    });
    expect(res.statusCode).toBe(409);
  });
});

describe("contact system", () => {
  beforeEach(async () => {
    await prisma.contactMessage.deleteMany({});
  });

  it("stores a valid message", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/contact",
      payload: { name: "Recruiter", email: "recruiter@example.com", message: "We have a backend role for Harsh." },
    });
    expect(res.statusCode).toBe(201);
    const stored = await prisma.contactMessage.findFirst({ where: { email: "recruiter@example.com" } });
    expect(stored).toBeTruthy();
    expect(stored!.status).toBe("NEW");
  });

  it("silently accepts honeypot submissions without storing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/contact",
      payload: { name: "Bot", email: "bot@spam.io", message: "buy my stuff please", company: "spam inc" },
    });
    expect([200, 202]).toContain(res.statusCode);
    const stored = await prisma.contactMessage.findFirst({ where: { email: "bot@spam.io" } });
    expect(stored).toBeNull();
  });

  it("rejects invalid payloads", async () => {
    const res = await app.inject({ method: "POST", url: "/api/contact", payload: { name: "A", email: "nope", message: "short" } });
    expect(res.statusCode).toBe(400);
  });

  it("rate limits contact floods per IP", async () => {
    const payloads = Array.from({ length: 8 }, (_, i) => ({
      name: `Flood ${i}`,
      email: `flood${i}@example.com`,
      message: "This is a flood test message.",
    }));
    const results = await Promise.all(payloads.map((p) => app.inject({ method: "POST", url: "/api/contact", payload: p })));
    expect(results.some((r) => r.statusCode === 429)).toBe(true);
  });

  it("messages inbox requires authentication", async () => {
    const res = await app.inject({ method: "GET", url: "/api/contact" });
    expect(res.statusCode).toBe(401);
  });
});

describe("chat engine", () => {
  beforeAll(async () => {
    // seed minimal knowledge if the DB is empty
    const count = await prisma.project.count();
    if (count === 0) {
      await prisma.project.create({
        data: {
          title: "QuantumMind", slug: "quantummind", shortDescription: "Multimodal RAG platform",
          category: "AI", tier: "featured", status: "complete", featured: true, year: "2025",
          order: 1, stack: ["FAISS", "Spring Boot", "FastAPI", "PostgreSQL"],
          longDescription: "Retrieval-augmented generation platform with FAISS vector search and SSE streaming.",
        },
      });
      await prisma.profile.create({
        data: {
          name: "Harsh Pandey", headline: "Full-Stack Engineer", subHeadline: "BACKEND • AI • SYSTEMS",
          bio: "Final-year B.Tech IT student at MIT-ADT University, Pune building systems end to end.",
          location: "Pune, India", email: "harshap17058@gmail.com",
        },
      });
    }
  });

  it("answers factual questions with sources", async () => {
    const res = await app.inject({ method: "POST", url: "/api/chat", payload: { message: "What is QuantumMind?" } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.answer).toContain("QuantumMind");
    expect(body.sources.length).toBeGreaterThan(0);
    expect(["VERIFIED", "INFERRED"]).toContain(body.confidence);
  });

  it("admits ignorance instead of hallucinating", async () => {
    const res = await app.inject({ method: "POST", url: "/api/chat", payload: { message: "What is Harsh's salary at Google?" } });
    const body = res.json();
    expect(body.confidence).toBe("UNKNOWN");
    expect(body.answer).toContain("don't have verified information");
  });

  it("rate limits chat floods", async () => {
    const results = await Promise.all(
      Array.from({ length: 15 }, () => app.inject({ method: "POST", url: "/api/chat", payload: { message: "who is harsh" } })),
    );
    expect(results.some((r) => r.statusCode === 429)).toBe(true);
  });
});

describe("certificates API", () => {
  it("paginates and filters by category", async () => {
    const all = await app.inject({ method: "GET", url: "/api/certificates" });
    expect(all.statusCode).toBe(200);
    const body = all.json();
    expect(body.total).toBeGreaterThanOrEqual(0);
    expect(body.certificates.length).toBeLessThanOrEqual(24);

    const filtered = await app.inject({ method: "GET", url: "/api/certificates?category=BACKEND" });
    for (const c of filtered.json().certificates) {
      expect(c.category).toBe("BACKEND");
    }
  });

  it("certificate mutations require auth + CSRF", async () => {
    const noAuth = await app.inject({ method: "POST", url: "/api/certificates", payload: { title: "X" } });
    expect(noAuth.statusCode).toBe(401);

    const { cookies } = await login();
    const noCsrf = await app.inject({ method: "POST", url: "/api/certificates", cookies, payload: { title: "X" } });
    expect(noCsrf.statusCode).toBe(403);
  });
});

describe("media upload security", () => {
  it("rejects an authenticated upload without CSRF", async () => {
    const { cookies } = await login();
    const res = await app.inject({
      method: "POST",
      url: "/api/media",
      cookies,
      headers: { "content-type": "multipart/form-data; boundary=hp-test" },
      payload: Buffer.from("--hp-test--\r\n"),
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("CSRF");
  });

  it("accepts a valid CSRF-protected image upload and can remove it", async () => {
    const { cookies, csrf } = await login();
    const boundary = "hp-media-test";
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
    const prefix = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="pixel.png"\r\nContent-Type: image/png\r\n\r\n`);
    const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
    const res = await app.inject({
      method: "POST",
      url: "/api/media",
      cookies,
      headers: { ...authHeaders(csrf), "content-type": `multipart/form-data; boundary=${boundary}` },
      payload: Buffer.concat([prefix, png, suffix]),
    });
    expect(res.statusCode).toBe(201);
    const asset = res.json().asset as { id: string; url: string };
    expect(asset.url).toMatch(/^\/static\/media\//);
    const removed = await app.inject({ method: "DELETE", url: `/api/media/${asset.id}`, cookies, headers: authHeaders(csrf) });
    expect(removed.statusCode).toBe(200);
  });
});

describe("security headers & misc", () => {
  it("sets hardened headers", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["referrer-policy"]).toContain("strict-origin");
  });

  it("404s unknown routes with JSON", async () => {
    const res = await app.inject({ method: "GET", url: "/api/unknown" });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("NOT_FOUND");
  });

  it("does not expose operational stats publicly", async () => {
    const res = await app.inject({ method: "GET", url: "/api/stats" });
    expect(res.statusCode).toBe(401);
  });

  it("allows only the configured frontend origin", async () => {
    const allowed = await app.inject({ method: "GET", url: "/api/profile", headers: { origin: "http://localhost:5173" } });
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(allowed.headers["access-control-allow-credentials"]).toBe("true");
    const denied = await app.inject({ method: "GET", url: "/api/profile", headers: { origin: "https://attacker.example" } });
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("rejects state-changing requests from a forged Origin even with valid CSRF", async () => {
    const { cookies, csrf } = await login();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      cookies,
      headers: { ...authHeaders(csrf), origin: "https://attacker.example" },
      payload: {
        title: "Forged Origin", slug: "forged-origin-x", shortDescription: "x", category: "TEST",
        tier: "experiment", status: "draft", featured: false, year: "2026", order: 1, stack: [],
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("private auth responses carry no-store cache control", async () => {
    const me = await app.inject({ method: "GET", url: "/api/auth/me" });
    expect(me.headers["cache-control"]).toContain("no-store");
  });
});

describe("rbac (role boundaries are server-enforced)", () => {
  async function loginAs(email: string, password: string) {
    const res = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password } });
    expect(res.statusCode).toBe(200);
    const cookies: Record<string, string> = {};
    for (const c of res.cookies) cookies[c.name] = c.value;
    return { cookies, csrf: cookies["hp_csrf"]! };
  }

  beforeAll(async () => {
    const { bcryptHash } = await import("../src/modules/auth/password.js");
    await prisma.user.upsert({
      where: { email: "editor@test.local" },
      update: { passwordHash: await bcryptHash("editor-pass-1234"), role: "EDITOR" },
      create: { email: "editor@test.local", passwordHash: await bcryptHash("editor-pass-1234"), role: "EDITOR" },
    });
    await prisma.user.upsert({
      where: { email: "viewer@test.local" },
      update: { passwordHash: await bcryptHash("viewer-pass-1234"), role: "VIEWER" },
      create: { email: "viewer@test.local", passwordHash: await bcryptHash("viewer-pass-1234"), role: "VIEWER" },
    });
  });

  it("VIEWER can read admin lists but cannot mutate content", async () => {
    const { cookies } = await loginAs("viewer@test.local", "viewer-pass-1234");
    const read = await app.inject({ method: "GET", url: "/api/contact", cookies });
    expect([200, 403]).toContain(read.statusCode);
    // VIEWER lacks content:write — project creation must be 403
    const { csrf } = await (async () => {
      const csrfRes = await app.inject({ method: "GET", url: "/api/auth/csrf", cookies });
      const jar: Record<string, string> = { ...cookies };
      for (const c of csrfRes.cookies) jar[c.name] = c.value;
      return { csrf: csrfRes.json().csrfToken as string, jar };
    })();
    const write = await app.inject({
      method: "POST", url: "/api/projects", cookies,
      headers: authHeaders(csrf),
      payload: { title: "Viewer Hack", slug: "viewer-hack-x", shortDescription: "x", category: "T", tier: "experiment", status: "draft", featured: false, year: "2026", order: 1, stack: [] },
    });
    expect(write.statusCode).toBe(403);
  });

  it("EDITOR can manage content but cannot hard-delete messages", async () => {
    const { cookies, csrf } = await loginAs("editor@test.local", "editor-pass-1234");
    const create = await app.inject({
      method: "POST", url: "/api/projects", cookies, headers: authHeaders(csrf),
      payload: { title: "Editor Project", slug: "editor-proj-x", shortDescription: "ok content", category: "TEST", tier: "experiment", status: "draft", featured: false, year: "2026", order: 5, stack: [] },
    });
    expect(create.statusCode).toBe(201);
    const id = create.json().project.id as string;
    await app.inject({ method: "DELETE", url: `/api/projects/${id}`, cookies, headers: authHeaders(csrf) });

    const msg = await prisma.contactMessage.create({
      data: { name: "RBAC", email: "rbac@test.local", message: "Boundary check message here.", status: "NEW" },
    });
    const del = await app.inject({ method: "DELETE", url: `/api/contact/${msg.id}`, cookies, headers: authHeaders(csrf) });
    expect(del.statusCode).toBe(403);
    await prisma.contactMessage.delete({ where: { id: msg.id } }).catch(() => undefined);
  });

  it("expired and revoked sessions are rejected", async () => {
    const { cookies } = await login();
    // revoke via sessions endpoint then verify /me fails
    const list = await app.inject({ method: "GET", url: "/api/auth/sessions", cookies });
    expect(list.statusCode).toBe(200);
    const current = (list.json().sessions as { id: string; current: boolean }[]).find((s) => s.current);
    expect(current).toBeTruthy();
    const csrf = cookies["hp_csrf"]!;
    const del = await app.inject({ method: "DELETE", url: `/api/auth/sessions/${current!.id}`, cookies, headers: authHeaders(csrf) });
    expect(del.statusCode).toBe(200);
    const me = await app.inject({ method: "GET", url: "/api/auth/me", cookies });
    expect(me.statusCode).toBe(401);
  });
});

describe("password + sessions + audit", () => {
  it("password change requires the current password and revokes other sessions", async () => {
    const { bcryptHash } = await import("../src/modules/auth/password.js");
    await prisma.user.upsert({
      where: { email: "pwd@test.local" },
      update: { passwordHash: await bcryptHash("Old-password-123!"), role: "ADMIN" },
      create: { email: "pwd@test.local", passwordHash: await bcryptHash("Old-password-123!"), role: "ADMIN" },
    });
    const first = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "pwd@test.local", password: "Old-password-123!" } });
    expect(first.statusCode).toBe(200);
    const jar1: Record<string, string> = {};
    for (const c of first.cookies) jar1[c.name] = c.value;
    const second = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "pwd@test.local", password: "Old-password-123!" } });
    const jar2: Record<string, string> = {};
    for (const c of second.cookies) jar2[c.name] = c.value;

    const bad = await app.inject({
      method: "POST", url: "/api/auth/change-password", cookies: jar1,
      headers: authHeaders(jar1["hp_csrf"]!), payload: { currentPassword: "wrong", newPassword: "New-password-456!" },
    });
    expect(bad.statusCode).toBe(401);

    const good = await app.inject({
      method: "POST", url: "/api/auth/change-password", cookies: jar1,
      headers: authHeaders(jar1["hp_csrf"]!), payload: { currentPassword: "Old-password-123!", newPassword: "New-password-456!" },
    });
    expect(good.statusCode).toBe(200);
    // other session revoked
    const me2 = await app.inject({ method: "GET", url: "/api/auth/me", cookies: jar2 });
    expect(me2.statusCode).toBe(401);
    const auditRow = await prisma.auditLog.findFirst({ where: { action: "AUTH_PASSWORD_CHANGED" }, orderBy: { createdAt: "desc" } });
    expect(auditRow).toBeTruthy();
    // restore password for other tests
    await prisma.user.update({ where: { email: "pwd@test.local" }, data: { passwordHash: await bcryptHash("Old-password-123!") } });
  });

  it("revoke-all requires recent authentication", async () => {
    const { cookies, csrf } = await login();
    // artificially age the session reauth
    await prisma.session.updateMany({ data: { reauthAt: new Date(Date.now() - 60 * 60 * 1000) } });
    const denied = await app.inject({ method: "POST", url: "/api/auth/sessions/revoke-all", cookies, headers: authHeaders(csrf), payload: {} });
    expect(denied.statusCode).toBe(403);
    expect(denied.json().error).toBe("REAUTH_REQUIRED");
  });
});

describe("2fa totp + recovery codes", () => {
  it("cancels a pending setup only with CSRF and recent authentication", async () => {
    const { bcryptHash } = await import("../src/modules/auth/password.js");
    const email = "twofa-cancel@test.local";
    const password = "Cancel-setup-password-123!";
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash: await bcryptHash(password), role: "ADMIN", totpEnabled: false, totpSecret: null },
      create: { email, passwordHash: await bcryptHash(password), role: "ADMIN" },
    });

    const login = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password } });
    const jar: Record<string, string> = {};
    for (const cookie of login.cookies) jar[cookie.name] = cookie.value;
    const csrf = jar["hp_csrf"]!;
    const setup = await app.inject({ method: "POST", url: "/api/auth/2fa/setup", cookies: jar, headers: authHeaders(csrf), payload: {} });
    expect(setup.statusCode).toBe(200);

    const missingCsrf = await app.inject({ method: "POST", url: "/api/auth/2fa/setup/cancel", cookies: jar, payload: {} });
    expect(missingCsrf.statusCode).toBe(403);
    await prisma.session.updateMany({ where: { user: { email } }, data: { reauthAt: new Date(Date.now() - 60 * 60 * 1000) } });
    const staleAuth = await app.inject({ method: "POST", url: "/api/auth/2fa/setup/cancel", cookies: jar, headers: authHeaders(csrf), payload: {} });
    expect(staleAuth.statusCode).toBe(403);
    expect((await prisma.user.findUnique({ where: { email }, select: { totpSecret: true } }))?.totpSecret).toBeTruthy();

    const reauth = await app.inject({ method: "POST", url: "/api/auth/reauth", cookies: jar, headers: authHeaders(csrf), payload: { password } });
    expect(reauth.statusCode).toBe(200);
    const cancelled = await app.inject({ method: "POST", url: "/api/auth/2fa/setup/cancel", cookies: jar, headers: authHeaders(csrf), payload: {} });
    expect(cancelled.statusCode).toBe(200);
    expect(await prisma.user.findUnique({ where: { email }, select: { totpSecret: true, totpEnabled: true } })).toEqual({ totpSecret: null, totpEnabled: false });
    expect(await prisma.auditLog.findFirst({ where: { action: "AUTH_2FA_SETUP_CANCELLED", actor: email } })).toBeTruthy();
    await prisma.session.deleteMany({ where: { user: { email } } });
    await prisma.user.delete({ where: { email } });
  });

  it("full enrollment, challenge login, recovery use, and disable with reauth", async () => {
    const { bcryptHash } = await import("../src/modules/auth/password.js");
    const email = "twofa@test.local";
    const password = "Twofa-password-123!";
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash: await bcryptHash(password), role: "ADMIN", totpEnabled: false, totpSecret: null },
      create: { email, passwordHash: await bcryptHash(password), role: "ADMIN" },
    });
    await prisma.recoveryCode.deleteMany({ where: { user: { email } } });

    const loginRes = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password } });
    const jar: Record<string, string> = {};
    for (const c of loginRes.cookies) jar[c.name] = c.value;
    const csrf = jar["hp_csrf"]!;

    const setup = await app.inject({ method: "POST", url: "/api/auth/2fa/setup", cookies: jar, headers: authHeaders(csrf), payload: {} });
    expect(setup.statusCode).toBe(200);
    const { secret } = setup.json() as { secret: string };
    expect(secret.length).toBeGreaterThan(10);

    const { authenticator } = await import("otplib");
    const code = authenticator.generate(secret);
    const enable = await app.inject({ method: "POST", url: "/api/auth/2fa/enable", cookies: jar, headers: authHeaders(csrf), payload: { code } });
    expect(enable.statusCode).toBe(200);
    const codes = (enable.json() as { recoveryCodes: string[] }).recoveryCodes;
    expect(codes.length).toBe(10);

    // password step now requires 2FA
    const step1 = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password } });
    expect(step1.statusCode).toBe(202);
    expect(step1.json().requires2FA).toBe(true);
    const challenge = step1.json().challenge as string;

    const badCode = await app.inject({ method: "POST", url: "/api/auth/login/2fa", payload: { challenge, code: "000000" } });
    expect(badCode.statusCode).toBe(401);

    const goodCode = authenticator.generate(secret);
    const step2 = await app.inject({ method: "POST", url: "/api/auth/login/2fa", payload: { challenge, code: goodCode } });
    expect(step2.statusCode).toBe(200);

    // recovery code single-use
    const step1b = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password } });
    const challenge2 = step1b.json().challenge as string;
    const recUse = await app.inject({ method: "POST", url: "/api/auth/login/2fa", payload: { challenge: challenge2, code: codes[0]! } });
    expect(recUse.statusCode).toBe(200);
    const jar2: Record<string, string> = {};
    for (const c of recUse.cookies) jar2[c.name] = c.value;
    const step1c = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password } });
    const reuse = await app.inject({ method: "POST", url: "/api/auth/login/2fa", payload: { challenge: step1c.json().challenge, code: codes[0]! } });
    expect(reuse.statusCode).toBe(401);

    // disable requires reauth — age the session first so the guard trips
    await prisma.session.updateMany({ where: { user: { email } }, data: { reauthAt: new Date(Date.now() - 60 * 60 * 1000) } });
    const denyDisable = await app.inject({ method: "POST", url: "/api/auth/2fa/disable", cookies: jar2, headers: authHeaders(jar2["hp_csrf"]!), payload: {} });
    expect([403, 400]).toContain(denyDisable.statusCode);
    const reauth = await app.inject({
      method: "POST", url: "/api/auth/reauth", cookies: jar2,
      headers: authHeaders(jar2["hp_csrf"]!), payload: { password, code: authenticator.generate(secret) },
    });
    expect(reauth.statusCode).toBe(200);
    // refresh jar cookies are unchanged; reauth touched server-side, retry disable with fresh /me session
    const disable = await app.inject({ method: "POST", url: "/api/auth/2fa/disable", cookies: jar2, headers: authHeaders(jar2["hp_csrf"]!), payload: {} });
    expect(disable.statusCode).toBe(200);

    await prisma.user.update({ where: { email }, data: { totpEnabled: false, totpSecret: null } });
    await prisma.recoveryCode.deleteMany({ where: { user: { email } } });
  });
});

describe("media validation", () => {
  it("rejects content-spoofed uploads and extension mismatches", async () => {
    const res = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "admin@harshpandey.dev", password: "test-admin-password-123" } });
    const cookies: Record<string, string> = {};
    for (const c of res.cookies) cookies[c.name] = c.value;
    const csrf = cookies["hp_csrf"]!;
    const boundary = "hp-spoof-test";
    const fakePng = Buffer.from("this is not a png at all, just text bytes 1234567890!!");
    const payload = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="evil.png"\r\nContent-Type: image/png\r\n\r\n`),
      fakePng,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const spoofed = await app.inject({
      method: "POST", url: "/api/media", cookies,
      headers: { "x-csrf-token": csrf, "content-type": `multipart/form-data; boundary=${boundary}` },
      payload,
    });
    expect(spoofed.statusCode).toBe(415);

    const mismatch = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="photo.jpg"\r\nContent-Type: image/png\r\n\r\n`),
      Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const res2 = await app.inject({
      method: "POST", url: "/api/media", cookies,
      headers: { "x-csrf-token": csrf, "content-type": `multipart/form-data; boundary=${boundary}` },
      payload: mismatch,
    });
    expect(res2.statusCode).toBe(415);
  });
});

describe("ai providers", () => {
  it("requires auth, masks keys, and enforces ADMIN for writes", async () => {
    const anon = await app.inject({ method: "GET", url: "/api/ai-providers" });
    expect(anon.statusCode).toBe(401);

    const { cookies, csrf } = await login();
    const empty = await app.inject({ method: "GET", url: "/api/ai-providers", cookies });
    expect(empty.statusCode).toBe(200);
    const list0 = empty.json() as { providers: unknown[]; envFallback: { provider: string } };
    expect(Array.isArray(list0.providers)).toBe(true);

    const created = await app.inject({
      method: "POST", url: "/api/ai-providers", cookies,
      headers: authHeaders(csrf),
      payload: {
        name: "Test OpenRouter",
        kind: "openrouter",
        baseUrl: "https://openrouter.ai/api/v1",
        model: "meta-llama/llama-3.1-8b-instruct:free",
        apiKey: "sk-test-secret-value-1234567890",
        temperature: 0.2,
        maxTokens: 200,
        timeoutMs: 8000,
      },
    });
    expect(created.statusCode).toBe(201);
    const body = created.json() as { provider: Record<string, unknown> };
    // Raw key must never appear in any response.
    expect(JSON.stringify(body)).not.toContain("sk-test-secret-value");
    expect(body.provider.hasKey).toBe(true);
    expect(body.provider.keyHint).toMatch(/^\*\*\*\*/);
    const id = body.provider.id as string;

    const listed = await app.inject({ method: "GET", url: "/api/ai-providers", cookies });
    expect(JSON.stringify(listed.json())).not.toContain("sk-test-secret-value");

    // Rotate + disable + delete round-trip.
    const rotated = await app.inject({
      method: "POST", url: `/api/ai-providers/${id}/rotate`, cookies,
      headers: authHeaders(csrf), payload: { apiKey: "sk-rotated-secret-0987654321" },
    });
    expect(rotated.statusCode).toBe(200);
    expect(JSON.stringify(rotated.json())).not.toContain("sk-rotated-secret");

    const disabled = await app.inject({
      method: "PATCH", url: `/api/ai-providers/${id}`, cookies,
      headers: authHeaders(csrf), payload: { enabled: false },
    });
    expect(disabled.statusCode).toBe(200);

    const deleted = await app.inject({
      method: "DELETE", url: `/api/ai-providers/${id}`, cookies, headers: authHeaders(csrf),
    });
    expect(deleted.statusCode).toBe(200);
  });
});

describe("interview", () => {
  it("starts and answers one question at a time without scores", async () => {
    const start = await app.inject({
      method: "POST", url: "/api/chat/interview", payload: { action: "start", history: [] },
    });
    expect(start.statusCode).toBe(200);
    const s = start.json() as { question: string | null; done: boolean };
    expect(typeof s.question === "string" && s.question.length > 10).toBe(true);
    expect(s.done).toBe(false);

    const ans = await app.inject({
      method: "POST", url: "/api/chat/interview",
      payload: { action: "answer", answer: "I care about backend APIs and evidence integrity.", history: [{ role: "ai", text: s.question! }] },
    });
    expect(ans.statusCode).toBe(200);
    const a = ans.json() as { question: string | null; reaction: string | null };
    expect(a.question || a.reaction).toBeTruthy();
    // No numeric scores anywhere.
    expect(JSON.stringify(a)).not.toMatch(/"score"|"rating"|"grade"/i);
  });
});
