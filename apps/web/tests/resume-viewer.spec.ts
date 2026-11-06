import { createElement } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PROFILE } from "../src/app/constants";
import { resolveMediaUrl } from "../src/lib/api";

vi.mock("../src/lib/data", () => ({
  useData: () => ({ profile: null }),
}));

vi.mock("../src/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/api")>();
  return { ...actual, api: { track: vi.fn(() => Promise.resolve(undefined)) } };
});

import { ResumeViewer, isPdfContentType, verifyPdfAvailable } from "../src/components/document/ResumeViewer";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const pdfPath = path.resolve(testsDir, "../public/files/HARSH-RESUME.pdf");

function headResponse(status: number, contentType: string | null) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? contentType : null) },
  } as unknown as Response;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("résumé PDF serving headers", () => {
  it("ships a valid PDF file that must be served inline as application/pdf", () => {
    const bytes = readFileSync(pdfPath);
    expect(statSync(pdfPath).size).toBeGreaterThan(10_000);
    expect(bytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    // Guards the Netlify regression where the /* SPA redirect serves
    // index.html (text/html) instead of the PDF bytes.
    expect(bytes.includes(Buffer.from("<html", "ascii"))).toBe(false);
  });

  it("resolves the canonical résumé path on the frontend origin", () => {
    expect(PROFILE.resume.path).toBe("/files/HARSH-RESUME.pdf");
    expect(resolveMediaUrl(PROFILE.resume.path, "https://api.example.test")).toBe("/files/HARSH-RESUME.pdf");
  });

  it("accepts the production Content-Type for inline PDF rendering", () => {
    expect(isPdfContentType("application/pdf")).toBe(true);
    expect(isPdfContentType("application/pdf; charset=binary")).toBe(true);
    expect(isPdfContentType("text/html; charset=UTF-8")).toBe(false);
    expect(isPdfContentType(null)).toBe(false);
    expect(isPdfContentType(undefined)).toBe(false);
  });
});

describe("verifyPdfAvailable (failure detection beyond iframe onError)", () => {
  it("accepts a healthy PDF HEAD response", async () => {
    const fetchFn = vi.fn(async () => headResponse(200, "application/pdf"));
    await expect(verifyPdfAvailable("/files/HARSH-RESUME.pdf", fetchFn as unknown as typeof fetch)).resolves.toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledWith("/files/HARSH-RESUME.pdf", { method: "HEAD" });
  });

  it("rejects an SPA fallback serving text/html", async () => {
    const fetchFn = vi.fn(async () => headResponse(200, "text/html; charset=UTF-8"));
    const result = await verifyPdfAvailable("/files/HARSH-RESUME.pdf", fetchFn as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/unexpected-content-type/);
  });

  it("rejects missing PDFs without relying on iframe onError", async () => {
    const fetchFn = vi.fn(async () => headResponse(404, "text/html"));
    const result = await verifyPdfAvailable("/files/HARSH-RESUME.pdf", fetchFn as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("status:404");
  });

  it("reports network failures as unavailable", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("offline");
    });
    const result = await verifyPdfAvailable("/files/HARSH-RESUME.pdf", fetchFn as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: "network-error" });
  });
});

describe("ResumeViewer preview rendering", () => {
  it("embeds the native viewer without sandbox so Chrome's PDF viewer can execute", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => headResponse(200, "application/pdf")));
    render(createElement(ResumeViewer, { open: true, onClose: () => undefined }));
    const frame = (await screen.findByTitle("Harsh Pandey résumé")) as HTMLIFrameElement;
    expect(frame.tagName).toBe("IFRAME");
    expect(frame.getAttribute("src")).toBe("/files/HARSH-RESUME.pdf#toolbar=0");
    // Regression guard: sandbox="allow-same-origin" (without allow-scripts)
    // blocks Chrome's native PDF viewer. Our own public PDF must not sandbox it.
    expect(frame.hasAttribute("sandbox")).toBe(false);
    expect(document.querySelector(".resume-viewer")).toBeTruthy();
  });

  it("keeps download and open-in-new-tab working independently of the preview", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => headResponse(200, "application/pdf")));
    render(createElement(ResumeViewer, { open: true, onClose: () => undefined }));
    await screen.findByTitle("Harsh Pandey résumé");

    const download = screen.getByRole("link", { name: "Download résumé" });
    expect(download.getAttribute("href")).toBe("/files/HARSH-RESUME.pdf");
    expect(download.hasAttribute("download")).toBe(true);

    const openNew = screen.getByRole("link", { name: "Open résumé in new tab" });
    expect(openNew.getAttribute("href")).toBe("/files/HARSH-RESUME.pdf");
    expect(openNew.getAttribute("target")).toBe("_blank");
    expect(openNew.getAttribute("rel")).toContain("noopener");
  });

  it("shows the fallback with working links when the PDF is not servable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => headResponse(404, "text/html")));
    render(createElement(ResumeViewer, { open: true, onClose: () => undefined }));
    const fallback = await screen.findByText("Preview unavailable");
    expect(fallback).toBeTruthy();
    // Native embed is removed in the failed state; direct actions must remain.
    expect(screen.queryByTitle("Harsh Pandey résumé")).toBeNull();
    const openFallbacks = screen.getAllByRole("link", { name: "Open in new tab" });
    expect(openFallbacks.length).toBeGreaterThanOrEqual(1);
    for (const link of openFallbacks) {
      expect(link.getAttribute("href")).toBe("/files/HARSH-RESUME.pdf");
      expect(link.getAttribute("target")).toBe("_blank");
    }
    const retry = screen.getByRole("button", { name: "Retry preview" });
    expect(retry).toBeTruthy();
  });

  it("recovers the failure state when closed and reopened", async () => {
    const fetchMock = vi.fn(async () => headResponse(404, "text/html"));
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = render(createElement(ResumeViewer, { open: true, onClose: () => undefined }));
    await screen.findByText("Preview unavailable");

    fetchMock.mockResolvedValueOnce(headResponse(200, "application/pdf"));
    rerender(createElement(ResumeViewer, { open: false, onClose: () => undefined }));
    rerender(createElement(ResumeViewer, { open: true, onClose: () => undefined }));
    await waitFor(() => expect(screen.queryByText("Preview unavailable")).toBeNull());
    expect(await screen.findByTitle("Harsh Pandey résumé")).toBeTruthy();
  });
});
