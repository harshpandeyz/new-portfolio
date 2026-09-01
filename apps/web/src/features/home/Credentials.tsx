import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../../lib/api";
import { useData } from "../../lib/data";
import { unlock } from "../../lib/achievements";
import type { Certificate } from "@hp/shared";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState";
import { CredentialCard } from "../credentials/CredentialCard";
import { CredentialViewer } from "../credentials/CredentialViewer";

/**
 * Credentials: five selected first (3 + 2), then one "Others" tile that leads
 * to the full archive at /credentials. Credentials open in an in-page modal —
 * never a route that pulls the visitor away from the portfolio.
 */
export function Credentials() {
  const { certTotal } = useData();
  const navigate = useNavigate();
  const [items, setItems] = useState<Certificate[]>([]);
  const [total, setTotal] = useState(certTotal);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [viewer, setViewer] = useState<Certificate | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(false);
    api
      .certificates({ category: "ALL", search: "", page: 1 })
      .then((r) => { if (!live) return; setItems(r.certificates); setTotal(r.total); })
      .catch(() => { if (live) setError(true); })
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [retryKey]);

  const selected = useMemo(
    () => [...items].sort((a, b) => (Number(b.featured) - Number(a.featured)) || a.order - b.order).filter((c) => c.featured).slice(0, 5),
    [items],
  );

  const openViewer = (c: Certificate) => {
    setViewer(c);
    unlock("archivist");
    void api.track("certificate_view", c.title);
  };

  const navigateViewer = (dir: -1 | 1) => {
    if (!viewer || selected.length === 0) return;
    const index = selected.findIndex((item) => item.id === viewer.id);
    const next = selected[(index + dir + selected.length) % selected.length];
    if (next) setViewer(next);
  };

  const othersCount = Math.max(0, total - selected.length);

  return (
    <section className="section credentials-section" id="credentials" aria-label="Credentials">
      <div className="container">
        <SectionHeader
          eyebrow="Credentials"
          title="Selected, not exhaustive."
          sub="The courses, assessments and milestones most relevant to how I build today. The full collection lives in the archive."
        />

        {loading ? (
          <EmptyState>Loading credentials…</EmptyState>
        ) : error ? (
          <ErrorState message="Credentials couldn't load." onRetry={() => setRetryKey((k) => k + 1)} />
        ) : (
          <div className="vault-grid">
            {selected.map((c, i) => (
              <CredentialCard key={c.id} certificate={c} index={i} onOpen={(cert) => openViewer(cert)} />
            ))}
            <button
              className="vault-others"
              onClick={() => navigate("/credentials")}
              data-reveal
              data-reveal-delay="0.16"
              aria-label={`Others — ${othersCount} more credentials in the archive`}
            >
              <span className="vo-label">Others</span>
              <span className="vo-count">{othersCount}</span>
              <span className="vo-sub">The full credential archive, filterable — {othersCount} more credentials.</span>
              <span className="vo-go">Open archive <span aria-hidden="true">→</span></span>
            </button>
          </div>
        )}
      </div>

      <CredentialViewer certificate={viewer} onClose={() => setViewer(null)} onNavigate={navigateViewer} hasNeighbors={selected.length > 1} />
    </section>
  );
}