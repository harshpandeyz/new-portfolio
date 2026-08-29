import { useEffect, useMemo, useRef, useState } from "react";

import { api, resolveMediaUrl } from "../../lib/api";
import { useData } from "../../lib/data";
import { unlock } from "../../lib/achievements";
import type { Certificate } from "@hp/shared";

const FILTERS = ["ALL", "AI", "BACKEND", "CLOUD", "DATABASE", "DATA", "DEVELOPMENT", "SECURITY", "OTHER"] as const;
const labelFor = (value: string) => value === "ALL" ? "All" : value.charAt(0) + value.slice(1).toLowerCase();

export function Credentials() {
  const { certTotal } = useData();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Certificate[]>([]);
  const [total, setTotal] = useState(certTotal);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [viewer, setViewer] = useState<Certificate | null>(null);
  const [viewerAssetState, setViewerAssetState] = useState<"loading" | "ready" | "error">("loading");
  const [showAll, setShowAll] = useState(false);
  const viewerCloseRef = useRef<HTMLButtonElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(false);
    api
      .certificates({ category: filter, search, page })
      .then((r) => {
        if (!live) return;
        setItems(r.certificates);
        setTotal(r.total);
      })
      .catch(() => { if (live) { setItems([]); setError(true); } })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [filter, search, page, retryKey]);

  // focus trap + escape for viewer
  useEffect(() => {
    if (!viewer) return;
    document.body.classList.add("no-scroll");
    lastFocusRef.current = document.activeElement as HTMLElement;
    window.setTimeout(() => viewerCloseRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeViewer();
      if (e.key === "ArrowLeft") navigateViewer(-1);
      if (e.key === "ArrowRight") navigateViewer(1);
      if (e.key === "Tab") {
        const focusables = document.querySelectorAll<HTMLElement>(".cert-viewer-body button, .cert-viewer-body a");
        if (focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.classList.remove("no-scroll"); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer]);

  // A missing upload must resolve to an explicit fallback, never an empty
  // image/PDF frame. HEAD is best-effort so external documents without CORS
  // can still render through the browser's native viewer.
  useEffect(() => {
    if (!viewer?.fileUrl) {
      setViewerAssetState("error");
      return;
    }
    let live = true;
    const controller = new AbortController();
    setViewerAssetState("loading");
    fetch(resolveMediaUrl(viewer.fileUrl), { method: "HEAD", credentials: "include", signal: controller.signal })
      .then((response) => {
        if (live && !response.ok) setViewerAssetState("error");
      })
      .catch(() => {
        // A CORS-blocked preflight should not prevent a browser-renderable
        // external document from loading; img/iframe onError remains the
        // authoritative fallback.
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [viewer]);

  const openViewer = (c: Certificate, source?: HTMLElement) => {
    lastFocusRef.current = source ?? document.activeElement as HTMLElement;
    setViewer(c);
    unlock("archivist");
  };

  const closeViewer = () => {
    setViewer(null);
    document.body.classList.remove("no-scroll");
    lastFocusRef.current?.focus();
  };

  const navigateViewer = (direction: -1 | 1) => {
    const viewerItems = showAll ? items : displayItems;
    if (!viewer || viewerItems.length === 0) return;
    const index = viewerItems.findIndex((item) => item.id === viewer.id);
    const next = viewerItems[(index + direction + viewerItems.length) % viewerItems.length];
    if (next) setViewer(next);
  };

  const isImage = useMemo(() => viewer?.fileUrl?.match(/\.(png|jpe?g|webp|avif|gif)$/i), [viewer]);
  const featuredItems = items.filter((item) => item.featured);
  const displayItems = showAll ? items : (featuredItems.length > 0 ? featuredItems : items).slice(0, 4);
  const pages = Math.max(1, Math.ceil(total / 24));

  return (
    <section className="section credentials-section" id="credentials" aria-label="Credentials">
      <div className="container">
        <div className="section-head" data-reveal>
          <div>
            <span className="eyebrow">Credentials</span>
            <h2 className="section-title">Proof of the work.</h2>
            <p className="section-sub">
              A selection of courses, assessments, and milestones that have shaped how I build. {certTotal} credentials in total.
            </p>
          </div>
        </div>

        {!showAll && <div className="credentials-intro" data-reveal><span>Selected credentials</span><p>The milestones most relevant to how I work today.</p></div>}

        {showAll && <div className="vault-controls" data-reveal>
          <div className="vault-filters" role="group" aria-label="Certificate categories">
            {FILTERS.map((f) => (
              <button
                key={f}
                aria-pressed={filter === f}
                className={`vault-filter${filter === f ? " active" : ""}`}
                onClick={() => {
                  setShowAll(true);
                  setFilter(f);
                  setPage(1);
                }}
              >
                {labelFor(f)}
              </button>
            ))}
          </div>
          <div className="vault-search">
              <input
                className="input"
                placeholder="Search credentials"
              aria-label="Search certificates"
              value={search}
              onChange={(e) => {
                setShowAll(true);
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", padding: "10px 14px" }}
            />
          </div>
        </div>}

        {showAll && <div className="vault-count" style={{ marginBottom: 16 }} aria-live="polite">{loading ? "Loading credentials…" : `${total} credential${total === 1 ? "" : "s"} · page ${page} of ${pages}`}</div>}

        <div className="vault-grid">
          {loading && <div className="empty-state">Loading credentials…</div>}
          {displayItems.map((c, i) => (
            <button className="vault-item brackets" key={c.id} onClick={(event) => openViewer(c, event.currentTarget)} data-reveal data-reveal-delay={String((i % 6) * 0.04)} aria-label={`View certificate: ${c.title}`}>
              <div className="certificate-preview" aria-hidden="true">{c.fileUrl && c.fileUrl.match(/\.(png|jpe?g|webp|avif|gif)$/i) ? <img src={resolveMediaUrl(c.fileUrl)} alt="" loading="lazy" /> : <span>{c.fileUrl ? "PDF" : "Details only"}</span>}</div>
              <div className="vi-top">
                <span className="vi-cat">{labelFor(c.category)}</span>
                {c.featured && <span className="vi-featured" title="Featured credential">★</span>}
              </div>
              <h3>{c.title}</h3>
              <div className="vi-issuer">{c.issuer}</div>
              <div className="vi-foot">
                <span>{c.issuedOn ?? "Date not listed"}</span>
                {c.credentialId && <span>Credential ID · {c.credentialId}</span>}
                <span className="open">View certificate ↗</span>
              </div>
            </button>
          ))}
          {!loading && items.length === 0 && (
            <div className="empty-state">{error ? <>Credentials couldn’t load. <button className="text-link" onClick={() => setRetryKey((key) => key + 1)}>Try again</button></> : "No credentials match this search."}</div>
          )}
        </div>

        {!showAll && <button className="credentials-more btn" onClick={() => setShowAll(true)}>View all credentials <span>{certTotal} ↗</span></button>}

        {showAll && pages > 1 && (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 30 }}>
            <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← PREV</button>
            <button className="btn btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>NEXT →</button>
          </div>
        )}
      </div>

      {viewer && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label={`Certificate: ${viewer.title}`} onClick={closeViewer}>
          <div className="palette cert-viewer-body" onClick={(e) => e.stopPropagation()}>
            <div className="term-bar">
                    <span>Certificate · {labelFor(viewer.category)}</span>
              <button ref={viewerCloseRef} className="chat-icon-btn" onClick={closeViewer}>Close ✕</button>
            </div>
            <div
              className="cert-viewer-frame"
              onTouchStart={(event) => { touchStartXRef.current = event.changedTouches[0]?.clientX ?? null; }}
              onTouchEnd={(event) => {
                const startX = touchStartXRef.current;
                const endX = event.changedTouches[0]?.clientX;
                touchStartXRef.current = null;
                if (startX === null || endX === undefined || Math.abs(endX - startX) < 48) return;
                navigateViewer(endX < startX ? 1 : -1);
              }}
            >
              {!viewer.fileUrl && <div className="cert-viewer-fallback"><strong>This credential has no document attached.</strong><span>The record is still available with its issuer and date details.</span></div>}
              {viewer.fileUrl && viewerAssetState === "loading" && <div className="cert-viewer-fallback"><span>Loading credential…</span></div>}
              {viewer.fileUrl && viewerAssetState === "error" && <div className="cert-viewer-fallback"><strong>Preview unavailable.</strong><span>This document could not be loaded right now.</span><button className="btn btn-sm" onClick={() => setViewerAssetState("loading")}>Try again</button></div>}
              {viewer.fileUrl && viewerAssetState !== "error" && (
                isImage ? (
                  <img src={resolveMediaUrl(viewer.fileUrl)} alt={`${viewer.title} certificate`} onLoad={() => setViewerAssetState("ready")} onError={() => setViewerAssetState("error")} />
                ) : (
                  <iframe src={resolveMediaUrl(viewer.fileUrl)} title={`${viewer.title} certificate`} loading="lazy" onLoad={() => setViewerAssetState("ready")} onError={() => setViewerAssetState("error")} />
                )
              )}
            </div>
            <div className="cert-viewer-info">
              <div>
                <div className="ci-title">{viewer.title}</div>
                <div className="ci-meta">
                  {viewer.issuer}{viewer.issuedOn ? ` · ${viewer.issuedOn}` : ""}{viewer.credentialId ? ` · ID ${viewer.credentialId}` : ""}
                </div>
              </div>
              <div className="ci-actions">
                <button className="btn btn-sm" onClick={() => navigateViewer(-1)} disabled={(showAll ? items : displayItems).length < 2} aria-label="Previous certificate">Previous</button>
                <button className="btn btn-sm" onClick={() => navigateViewer(1)} disabled={(showAll ? items : displayItems).length < 2} aria-label="Next certificate">Next</button>
                {viewer.fileUrl && (
                  <a className="btn btn-sm" href={resolveMediaUrl(viewer.fileUrl)} download target="_blank" rel="noopener noreferrer">
                    Download ↓
                  </a>
                )}
                {viewer.fileUrl && (
                  <a className="btn btn-sm btn-ghost" href={resolveMediaUrl(viewer.fileUrl)} target="_blank" rel="noopener noreferrer">
                    Open ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
