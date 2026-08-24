import { useEffect, useMemo, useRef, useState } from "react";

import { api } from "../../lib/api";
import { useData } from "../../lib/data";
import { unlock } from "../../lib/achievements";
import type { Certificate } from "@hp/shared";

const FILTERS = ["ALL", "AI", "BACKEND", "CLOUD", "DATABASE", "DATA", "DEVELOPMENT", "SECURITY", "OTHER"] as const;

export function CertificateVault() {
  const { certificates, certTotal } = useData();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Certificate[]>([]);
  const [total, setTotal] = useState(certTotal);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<Certificate | null>(null);
  const viewerCloseRef = useRef<HTMLButtonElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    api
      .certificates({ category: filter, search, page })
      .then((r) => {
        if (!live) return;
        setItems(r.certificates);
        setTotal(r.total);
      })
      .catch(() => live && setItems([]))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [filter, search, page]);

  // focus trap + escape for viewer
  useEffect(() => {
    if (!viewer) return;
    lastFocusRef.current = document.activeElement as HTMLElement;
    window.setTimeout(() => viewerCloseRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeViewer();
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
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer]);

  const openViewer = (c: Certificate) => {
    lastFocusRef.current = document.activeElement as HTMLElement;
    setViewer(c);
    unlock("archivist");
  };

  const closeViewer = () => {
    setViewer(null);
    lastFocusRef.current?.focus();
  };

  const isImage = useMemo(() => viewer?.fileUrl?.match(/\.(png|jpe?g|webp|avif|gif)$/i), [viewer]);
  const pages = Math.max(1, Math.ceil(total / 24));

  return (
    <section className="sys-section" id="credentials" aria-label="Certificate archive">
      <div className="container">
        <div className="section-head" data-reveal>
          <span className="section-index">05 / CREDENTIALS</span>
          <div>
            <h2 className="section-title">Certificate Archive</h2>
            <p className="section-sub">
              {certTotal} verified credentials on file — issuers, dates and credential IDs preserved from
              the original documents. Inspect any record in the evidence viewer.
            </p>
          </div>
        </div>

        <div className="vault-controls" data-reveal>
          <div className="vault-filters" role="tablist" aria-label="Certificate categories">
            {FILTERS.map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                className={`vault-filter${filter === f ? " active" : ""}`}
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="vault-search">
            <input
              className="input"
              placeholder="SEARCH ARCHIVE…"
              aria-label="Search certificates"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", padding: "10px 14px" }}
            />
          </div>
        </div>

        <div className="vault-count" style={{ marginBottom: 16 }} aria-live="polite">
          {loading ? "SCANNING ARCHIVE…" : `${total} RECORD${total === 1 ? "" : "S"} · PAGE ${page}/${pages}`}
        </div>

        <div className="vault-grid">
          {items.map((c, i) => (
            <button className="vault-item brackets" key={c.id} onClick={() => openViewer(c)} data-reveal data-reveal-delay={String((i % 6) * 0.04)}>
              <div className="vi-top">
                <span className="vi-cat">{c.category}</span>
                {c.featured && <span className="vi-featured" title="Featured credential">★</span>}
              </div>
              <h3>{c.title}</h3>
              <div className="vi-issuer">{c.issuer}</div>
              <div className="vi-foot">
                <span>{c.issuedOn ?? "DATE ON FILE"}</span>
                {c.credentialId && <span>ID · {c.credentialId}</span>}
                <span className="open">INSPECT →</span>
              </div>
            </button>
          ))}
          {!loading && items.length === 0 && (
            <div className="mono mono-dim" style={{ padding: 30 }}>NO RECORDS MATCH THIS QUERY.</div>
          )}
        </div>

        {pages > 1 && (
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
              <span>EVIDENCE VIEWER · {viewer.category}</span>
              <button ref={viewerCloseRef} className="chat-icon-btn" onClick={closeViewer}>CLOSE ✕</button>
            </div>
            <div className="cert-viewer-frame">
              {viewer.fileUrl ? (
                isImage ? (
                  <img src={viewer.fileUrl} alt={`${viewer.title} certificate`} />
                ) : (
                  <iframe src={viewer.fileUrl} title={`${viewer.title} certificate`} loading="lazy" />
                )
              ) : (
                <div className="mono mono-dim">DOCUMENT NOT ATTACHED — METADATA ONLY</div>
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
                {viewer.fileUrl && (
                  <a className="btn btn-sm" href={viewer.fileUrl} download target="_blank" rel="noopener noreferrer">
                    DOWNLOAD ↓
                  </a>
                )}
                {viewer.fileUrl && (
                  <a className="btn btn-sm btn-ghost" href={viewer.fileUrl} target="_blank" rel="noopener noreferrer">
                    FULLSCREEN ↗
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
