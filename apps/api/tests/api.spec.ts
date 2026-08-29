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
    expect(res.json()).toEqual({ status: "ok" });
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
});
