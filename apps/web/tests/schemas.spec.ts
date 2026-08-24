import { describe, expect, it } from "vitest";

// retrieval logic is server-side; here we test the shared schema contracts
import { contactSchema, chatSchema, loginSchema, projectInputSchema } from "@hp/shared";

describe("shared validation schemas", () => {
  it("accepts a valid contact message", () => {
    const r = contactSchema.safeParse({ name: "Jane Recruiter", email: "jane@corp.com", message: "We would love to talk about a backend role." });
    expect(r.success).toBe(true);
  });

  it("rejects short contact messages and bad emails", () => {
    expect(contactSchema.safeParse({ name: "J", email: "jane@corp.com", message: "hi" }).success).toBe(false);
    expect(contactSchema.safeParse({ name: "Jane", email: "not-an-email", message: "A perfectly long message." }).success).toBe(false);
  });

  it("honeypot field passes schema (bot handling is silent, server-side)", () => {
    // bots that fill `company` are accepted with 202 by the API but never stored —
    // rejection happens in the handler, not the schema, to avoid tipping off bots.
    expect(contactSchema.safeParse({ name: "Bot", email: "b@b.io", message: "spam message here", company: "x" }).success).toBe(true);
  });

  it("chat message bounds are enforced", () => {
    expect(chatSchema.safeParse({ message: "o" }).success).toBe(false);
    expect(chatSchema.safeParse({ message: "x".repeat(601) }).success).toBe(false);
    expect(chatSchema.safeParse({ message: "What projects exist?" }).success).toBe(true);
  });

  it("login requires email + min 8 char password", () => {
    expect(loginSchema.safeParse({ email: "a@b.io", password: "short" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.io", password: "long-enough-password" }).success).toBe(true);
  });

  it("project slug must be kebab-case", () => {
    const base = { title: "Test", shortDescription: "desc", category: "CAT", tier: "featured", status: "draft", featured: false, year: "2026", order: 1, stack: [] };
    expect(projectInputSchema.safeParse({ ...base, slug: "Bad Slug" }).success).toBe(false);
    expect(projectInputSchema.safeParse({ ...base, slug: "valid-slug-2" }).success).toBe(true);
  });
});
