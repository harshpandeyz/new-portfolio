import { describe, expect, it } from "vitest";

import { resolveMediaUrl } from "../src/lib/api";

describe("canonical media URL resolution", () => {
  it("keeps frontend-owned static files on the frontend origin", () => {
    expect(resolveMediaUrl("/files/harsh-photo.jpeg", "https://api.example.test")).toBe("/files/harsh-photo.jpeg");
    expect(resolveMediaUrl("files/HARSH-RESUME.pdf", "https://api.example.test")).toBe("/files/HARSH-RESUME.pdf");
  });

  it("moves API-owned routes to the configured API origin", () => {
    expect(resolveMediaUrl("/static/certificates/example.pdf", "https://api.example.test/")).toBe("https://api.example.test/static/certificates/example.pdf");
    expect(resolveMediaUrl("/api/media/example", "https://api.example.test")).toBe("https://api.example.test/api/media/example");
  });

  it("does not rewrite absolute or browser-managed URLs", () => {
    expect(resolveMediaUrl("https://cdn.example.test/image.webp", "https://api.example.test")).toBe("https://cdn.example.test/image.webp");
    expect(resolveMediaUrl("data:image/png;base64,abc", "https://api.example.test")).toBe("data:image/png;base64,abc");
  });
});
