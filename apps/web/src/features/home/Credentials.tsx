import { lazy, Suspense, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useData } from "../../lib/data";
import { api } from "../../lib/api";
import type { Certificate } from "@hp/shared";
import { unlock } from "../../lib/achievements";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState";
import { CredentialCard } from "../credentials/CredentialCard";

const CredentialViewer = lazy(() => import("../credentials/CredentialViewer").then((module) => ({ default: module.CredentialViewer })));

/**
 * Credentials: five selected first (3 + 2), then one "Others" tile that leads
 * to the full archive at /credentials. Credentials open in an in-page modal —
 * never a route that pulls the visitor away from the portfolio.
 */
export function Credentials() {
  const { certificates, certTotal, loaded, error, refresh } = useData();
  const navigate = useNavigate();
  const [viewer, setViewer] = useState<(typeof certificates)[number] | null>(null);

  const selected = useMemo(
    () => certificates.filter((c) => c.featured).slice(0, 5),
    [certificates],
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

  const othersCount = Math.max(0, certTotal - selected.length);

  return (
    <section className="section credentials-section" id="credentials" aria-label="Credentials">
      <div className="container">
        <SectionHeader
          eyebrow="Credentials"
          title="Selected, not exhaustive."
          sub="The courses, assessments and milestones most relevant to how I build today. The full collection lives in the archive."
        />

        {!loaded ? (
          <EmptyState>Loading credentials…</EmptyState>
        ) : error && certificates.length === 0 ? (
          <ErrorState message="Credentials couldn't load." onRetry={() => void refresh()} />
        ) : (
          <>
          {error && <p className="credentials-stale" role="status">Refresh failed. Showing saved credentials. <button type="button" onClick={() => void refresh()}>Try again</button></p>}
          <div className="vault-grid">
            {selected.map((c, i) => (
              <CredentialCard key={c.id} certificate={c} index={i} onOpen={(cert) => openViewer(cert)} />
            ))}
            <button
              className="vault-others"
              onClick={() => navigate("/credentials")}


              aria-label={`Others — ${othersCount} more credentials in the archive`}
            >
              <span className="vo-label">Others</span>
              <span className="vo-count">{othersCount}</span>
              <span className="vo-sub">The full credential archive, filterable — {othersCount} more credentials.</span>
              <span className="vo-go">Open archive <span aria-hidden="true">→</span></span>
            </button>
          </div>
          </>
        )}
      </div>

      {viewer && <Suspense fallback={null}><CredentialViewer certificate={viewer} onClose={() => setViewer(null)} onNavigate={navigateViewer} hasNeighbors={selected.length > 1} /></Suspense>}
    </section>
  );
}
