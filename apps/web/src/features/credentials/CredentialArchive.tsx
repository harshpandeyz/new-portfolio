import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../lib/api";
import { unlock } from "../../lib/achievements";
import { scrollBehavior } from "../../lib/motion";
import type { Certificate } from "@hp/shared";
import { Button } from "../../components/ui/Button";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState";
import { CredentialCard } from "./CredentialCard";
import { CredentialViewer } from "./CredentialViewer";
import "../../styles/subspace.css";
import "../archive.css";

const FILTERS = ["ALL", "AI", "BACKEND", "CLOUD", "DATABASE", "DATA", "DEVELOPMENT", "SECURITY", "OTHER"] as const;
const labelFor = (value: string) => (value === "ALL" ? "All" : value.charAt(0) + value.slice(1).toLowerCase());

/** The full credential archive — every course, assessment and milestone. */
export function CredentialArchive() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Certificate[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(24);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [viewer, setViewer] = useState<Certificate | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [filter, debouncedSearch]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    api
      .certificates({ category: filter === "ALL" ? undefined : filter, search: debouncedSearch || undefined, page }, controller.signal)
      .then((r) => { setItems(r.certificates); setTotal(r.total); setPageSize(r.pageSize ?? 24); })
      .catch(() => {
        if (controller.signal.aborted) return;
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filter, debouncedSearch, page, retryKey]);

  const displayList = useMemo(
    () => [...items].sort((a, b) => (Number(b.featured) - Number(a.featured)) || a.order - b.order),
    [items],
  );

  const pages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

  const openViewer = (c: Certificate) => {
    setViewer(c);
    unlock("archivist");
    void api.track("certificate_view", c.title);
  };

  const navigateViewer = (dir: -1 | 1) => {
    if (!viewer || displayList.length === 0) return;
    const index = displayList.findIndex((item) => item.id === viewer.id);
    const next = displayList[(index + dir + displayList.length) % displayList.length];
    if (next) setViewer(next);
  };

  return (
    <div className="subspace">
      <div className="credentials-page" aria-label="Credential archive">
        <div className="container">
          <header className="vault-hero">
            <p className="archive-kicker"><Link to="/#credentials" className="archive-back">← Back to selected credentials</Link></p>
            <h1>The credential archive.</h1>
            <p className="vault-lede">
              Every course, assessment and major achievement — {total} certificates, filterable.
            </p>

            <div className="vault-controls">
              <div className="vault-filters" role="group" aria-label="Credential categories">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    aria-pressed={filter === f}
                    className={`vault-filter${filter === f ? " active" : ""}`}
                    onClick={() => setFilter(f)}
                  >
                    {labelFor(f)}
                  </button>
                ))}
              </div>
              <input
                className="input vault-search"
                placeholder="Search credentials"
                aria-label="Search credentials"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </header>

          <div className="vault-count" aria-live="polite">
            {loading ? "Loading credentials…" : `${total} credential${total === 1 ? "" : "s"} · page ${page} of ${pages}`}
          </div>

          <div className="vault-grid">
            {loading && items.length === 0 && <EmptyState>Loading credentials…</EmptyState>}
            {!loading && error && items.length === 0 && <ErrorState message="Credentials couldn't load." onRetry={() => setRetryKey((k) => k + 1)} />}
            {!loading && error && items.length > 0 && <p className="archive-stale" role="status">Refresh failed; showing the last loaded results, which may not match the current filters. <button type="button" onClick={() => setRetryKey((k) => k + 1)}>Try again</button></p>}
            {!loading && displayList.map((c, i) => (
              <CredentialCard key={c.id} certificate={c} index={i} onOpen={(cert) => openViewer(cert)} />
            ))}
            {!loading && !error && displayList.length === 0 && (
              <EmptyState>No credentials match this search.</EmptyState>
            )}
          </div>

          {!loading && pages > 1 && (
            <div className="vault-pagination" aria-label="Credential pages">
              <Button size="sm" disabled={page <= 1} onClick={() => { setPage((p) => p - 1); window.scrollTo({ top: 0, behavior: scrollBehavior() }); }}>← Prev</Button>
              <span className="mono mono-dim">{page} / {pages}</span>
              <Button size="sm" disabled={page >= pages} onClick={() => { setPage((p) => p + 1); window.scrollTo({ top: 0, behavior: scrollBehavior() }); }}>Next →</Button>
            </div>
          )}
        </div>
      </div>

      <CredentialViewer certificate={viewer} onClose={() => setViewer(null)} onNavigate={navigateViewer} hasNeighbors={displayList.length > 1} />
    </div>
  );
}
