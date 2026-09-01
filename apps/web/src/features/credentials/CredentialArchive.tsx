import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../lib/api";
import { unlock } from "../../lib/achievements";
import type { Certificate } from "@hp/shared";
import { Button } from "../../components/ui/Button";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState";
import { CredentialCard } from "./CredentialCard";
import { CredentialViewer } from "./CredentialViewer";

const FILTERS = ["ALL", "AI", "BACKEND", "CLOUD", "DATABASE", "DATA", "DEVELOPMENT", "SECURITY", "OTHER"] as const;
const labelFor = (value: string) => (value === "ALL" ? "All" : value.charAt(0) + value.slice(1).toLowerCase());

/** The full credential archive — every course, assessment and milestone. */
export function CredentialArchive() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Certificate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [viewer, setViewer] = useState<Certificate | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(false);
    api
      .certificates({ category: filter, search, page })
      .then((r) => { if (!live) return; setItems(r.certificates); setTotal(r.total); })
      .catch(() => { if (live) { setItems([]); setError(true); } })
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [filter, search, page, retryKey]);

  const displayList = useMemo(
    () => [...items].sort((a, b) => (Number(b.featured) - Number(a.featured)) || a.order - b.order),
    [items],
  );

  const pages = Math.max(1, Math.ceil(total / 24));

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
      <main className="credentials-page" aria-label="Credential archive">
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
            {loading && <EmptyState>Loading credentials…</EmptyState>}
            {!loading && displayList.map((c, i) => (
              <CredentialCard key={c.id} certificate={c} index={i} onOpen={(cert) => openViewer(cert)} />
            ))}
            {!loading && displayList.length === 0 && (
              <EmptyState>
                {error ? <ErrorState message="Credentials couldn't load." onRetry={() => setRetryKey((k) => k + 1)} /> : "No credentials match this search."}
              </EmptyState>
            )}
          </div>

          {!loading && pages > 1 && (
            <div className="vault-pagination" aria-label="Credential pages">
              <Button size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</Button>
              <span className="mono mono-dim">{page} / {pages}</span>
              <Button size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next →</Button>
            </div>
          )}
        </div>
      </main>

      <CredentialViewer certificate={viewer} onClose={() => setViewer(null)} onNavigate={navigateViewer} hasNeighbors={displayList.length > 1} />
    </div>
  );
}