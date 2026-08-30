import { useEffect, useMemo, useState } from "react";

import { api } from "../../lib/api";
import { useData } from "../../lib/data";
import { unlock } from "../../lib/achievements";
import type { Certificate } from "@hp/shared";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Button } from "../../components/ui/Button";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState";
import { CredentialCard } from "../credentials/CredentialCard";
import { CredentialViewer } from "../credentials/CredentialViewer";

const FILTERS = ["ALL", "AI", "BACKEND", "CLOUD", "DATABASE", "DATA", "DEVELOPMENT", "SECURITY", "OTHER"] as const;
const labelFor = (value: string) => (value === "ALL" ? "All" : value.charAt(0) + value.slice(1).toLowerCase());

/**
 * Credentials: a selected, meaningful set first (backend / software / AI /
 * cloud / database / major achievements), with the full collection available
 * behind "View all". Credentials open in an in-page modal — never a route that
 * pulls the visitor away from the portfolio.
 */
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
  const [showAll, setShowAll] = useState(false);
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

  const openViewer = (c: Certificate) => {
    setViewer(c);
    unlock("archivist");
    // The public viewer opens an in-page modal from the already-loaded list,
    // so it never hits GET /certificates/:id that tracks server-side. Track it
    // explicitly to keep certificate_view analytics accurate.
    void api.track("certificate_view", c.title);
  };

  const closeViewer = () => setViewer(null);

  const ordered = useMemo(() => [...items].sort((a, b) => (Number(b.featured) - Number(a.featured)) || a.order - b.order), [items]);
  const selected = useMemo(() => ordered.filter((c) => c.featured), [ordered]);
  const displayList = showAll ? ordered : selected;
  const pages = Math.max(1, Math.ceil(total / 24));

  const navigateViewer = (dir: -1 | 1) => {
    if (!viewer || displayList.length === 0) return;
    const index = displayList.findIndex((item) => item.id === viewer.id);
    const next = displayList[(index + dir + displayList.length) % displayList.length];
    if (next) setViewer(next);
  };

  return (
    <section className="section credentials-section" id="credentials" aria-label="Credentials">
      <div className="container">
        <SectionHeader
          eyebrow="Credentials"
          title="Selected, not exhaustive."
          sub="The courses, assessments and milestones most relevant to how I build today. The full collection stays available — it just doesn't compete with the work."
        />

        {!showAll && (
          <div className="credentials-intro" data-reveal>
            <span>Selected credentials</span>
            <p>Backend, software engineering, AI, cloud, databases and major college achievements.</p>
          </div>
        )}

        {showAll && (
          <div className="vault-controls" data-reveal>
            <div className="vault-filters" role="group" aria-label="Credential categories">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  aria-pressed={filter === f}
                  className={`vault-filter${filter === f ? " active" : ""}`}
                  onClick={() => { setShowAll(true); setFilter(f); setPage(1); }}
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
              onChange={(e) => { setShowAll(true); setSearch(e.target.value); setPage(1); }}
            />
          </div>
        )}

        {showAll && (
          <div className="vault-count" aria-live="polite">
            {loading ? "Loading credentials…" : `${total} credential${total === 1 ? "" : "s"} · page ${page} of ${pages}`}
          </div>
        )}

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

        {!showAll && (
          <div className="credentials-more-wrap" data-reveal>
            <Button variant="secondary" onClick={() => setShowAll(true)}>View all credentials <span>{certTotal}</span></Button>
          </div>
        )}

        {showAll && pages > 1 && (
          <div className="vault-pagination" style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: 24 }}>
            <Button size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</Button>
            <Button size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next →</Button>
          </div>
        )}
      </div>

      <CredentialViewer
        certificate={viewer}
        onClose={closeViewer}
        onNavigate={navigateViewer}
        hasNeighbors={displayList.length > 1}
      />
    </section>
  );
}