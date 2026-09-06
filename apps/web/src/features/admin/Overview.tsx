import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../lib/api";
import type { SystemStats } from "@hp/shared";
import { Badge, EmptyState, ErrorState, PageHead, SkeletonCard, formatTimeAgo } from "./ui";

interface Analytics {
  last30Days: { type: string; count: number }[];
  daily: { day: string; count: number }[];
}

interface OverviewData {
  recentMessages: { id: string; name: string; email: string; subject: string | null; message: string; status: string; createdAt: string }[];
  recentAudit: { id: string; action: string; entity: string; actor: string; createdAt: string }[];
}

export function Overview({ onUnreadChange }: { onUnreadChange: () => void }) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [extra, setExtra] = useState<OverviewData | null>(null);
  const [security, setSecurity] = useState<{ totpEnabled: boolean; activeSessions: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, a, o, sec] = await Promise.all([
          api.stats(),
          api.admin.analytics().catch(() => null),
          api.admin.overview().catch(() => null),
          api.securityOverview().catch(() => null),
        ]);
        if (cancelled) return;
        setStats(s);
        if (a) setAnalytics(a);
        if (o) setExtra(o as OverviewData);
        if (sec) setSecurity({ totpEnabled: sec.totpEnabled, activeSessions: sec.activeSessions });
        onUnreadChange();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load overview");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onUnreadChange]);

  if (error) return (<><PageHead title="Overview" desc="What needs your attention." /><ErrorState message={error} onRetry={() => window.location.reload()} /></>);

  if (!stats) {
    return (
      <>
        <PageHead title="Overview" desc="What needs your attention." />
        <div className="ctl-grid-4">
          {[0, 1, 2, 3].map((i) => (<SkeletonCard key={i} />))}
        </div>
      </>
    );
  }

  const maxDaily = Math.max(1, ...(analytics?.daily.map((d) => d.count) ?? [1]));
  const unread = stats.unreadMessages ?? 0;
  const needs2fa = security && !security.totpEnabled;
  const allClear = unread === 0 && !needs2fa;

  return (
    <>
      <PageHead
        title="Overview"
        desc="What needs your attention — live from your database."
        actions={
          <>
            <Link className="ctl-btn ctl-btn--secondary" to="/private/messages">Inbox{unread > 0 ? ` (${unread})` : ""}</Link>
            <Link className="ctl-btn ctl-btn--primary" to="/private/projects?new=1">+ New project</Link>
          </>
        }
      />

      {/* 1 — Needs attention */}
      {allClear ? (
        <div className="ctl-attention ctl-attention--clear" role="status">
          <span aria-hidden="true">✓</span>
          <div><b>All clear.</b> No unread messages and two-factor authentication is on.</div>
        </div>
      ) : (
        <div className="ctl-attention-list">
          {unread > 0 && (
            <Link to="/private/messages" className="ctl-attention">
              <span className="ctl-attention-count" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>
              <div><b>{unread} unread message{unread === 1 ? "" : "s"}</b><span>Open the inbox to triage →</span></div>
            </Link>
          )}
          {needs2fa && (
            <Link to="/private/security" className="ctl-attention ctl-attention--warn">
              <span aria-hidden="true">⬢</span>
              <div><b>Two-factor authentication is off</b><span>Enable it in the Security Center →</span></div>
            </Link>
          )}
        </div>
      )}

      {/* 2 — Content at a glance */}
      <div className="ctl-grid-4">
        <Link className="ctl-card ctl-stat" to="/private/projects"><span>PROJECTS</span><b>{stats.projects}</b><span className="ctl-stat-link">Manage →</span></Link>
        <Link className="ctl-card ctl-stat" to="/private/messages"><span>MESSAGES</span><b>{stats.contactMessages}</b><small>{unread} unread</small></Link>
        <Link className="ctl-card ctl-stat" to="/private/certificates"><span>CERTIFICATES</span><b>{stats.certificates}</b><span className="ctl-stat-link">Manage →</span></Link>
        <Link className="ctl-card ctl-stat" to="/private/skills"><span>SKILLS · TIMELINE</span><b>{stats.skills} · {stats.timelineItems}</b><span className="ctl-stat-link">Manage →</span></Link>
      </div>

      {/* 3 — Quick actions */}
      <div className="ctl-quickactions" aria-label="Quick actions">
        <Link className="ctl-btn ctl-btn--ghost ctl-btn--sm" to="/private/projects?new=1">+ Project</Link>
        <Link className="ctl-btn ctl-btn--ghost ctl-btn--sm" to="/private/certificates?new=1">+ Certificate</Link>
        <Link className="ctl-btn ctl-btn--ghost ctl-btn--sm" to="/private/timeline?new=1">+ Timeline entry</Link>
        <Link className="ctl-btn ctl-btn--ghost ctl-btn--sm" to="/private/media">⇪ Upload media</Link>
        <Link className="ctl-btn ctl-btn--ghost ctl-btn--sm" to="/private/messages">✉ View messages</Link>
      </div>

      <div className="ctl-grid-2">
        <div className="ctl-card">
          <h3>RECENT MESSAGES</h3>
          {!extra ? (
            <p style={{ color: "#8a93a3", fontSize: 13 }}>Loading…</p>
          ) : extra.recentMessages.length === 0 ? (
            <EmptyState title="Inbox zero" desc="New contact messages will appear here." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {extra.recentMessages.map((m) => (
                <Link key={m.id} to="/private/messages" style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                    <b style={{ fontSize: 13 }}>{m.name}</b>
                    <Badge tone={m.status === "NEW" ? "blue" : m.status === "SPAM" ? "red" : "neutral"}>{m.status}</Badge>
                    <span style={{ marginLeft: "auto", fontSize: 11.5, color: "#8a93a3" }}>{formatTimeAgo(m.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "#5b6472", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.subject || m.message.slice(0, 80)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="ctl-card">
          <h3>RECENT ACTIVITY</h3>
          {!extra ? (
            <p style={{ color: "#8a93a3", fontSize: 13 }}>Loading…</p>
          ) : extra.recentAudit.length === 0 ? (
            <EmptyState title="No activity yet" desc="Content changes and sign-ins will appear here." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {extra.recentAudit.slice(0, 6).map((l) => (
                <div key={l.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid #f0f2f6", fontSize: 12.5 }}>
                  <span style={{ fontFamily: "monospace", color: "#0a55d6", fontWeight: 700 }}>{l.action}</span>
                  <span style={{ marginLeft: "auto", color: "#8a93a3" }}>{formatTimeAgo(l.createdAt)}</span>
                </div>
              ))}
              <Link to="/private/audit" className="ctl-stat-link" style={{ marginTop: 8 }}>Full audit log →</Link>
            </div>
          )}
        </div>
      </div>

      <div className="ctl-card" style={{ marginTop: 12 }}>
        <h3>TRAFFIC — LAST 30 DAYS · {stats.pageViews} PAGE VIEWS TOTAL</h3>
        {analytics && analytics.daily.length > 0 ? (
          <>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 90 }} aria-hidden="true">
              {analytics.daily.map((d) => (
                <div key={String(d.day)} title={`${new Date(d.day).toLocaleDateString()}: ${d.count}`} style={{ flex: 1, height: `${Math.max(3, (d.count / maxDaily) * 100)}%`, background: "#0a66ff", opacity: 0.7, borderRadius: 3 }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
              {analytics.last30Days.map((a) => (
                <span key={a.type} style={{ fontSize: 12, color: "#5b6472" }}>{a.type.replace(/_/g, " ")}: <b style={{ color: "#0a55d6" }}>{a.count}</b></span>
              ))}
            </div>
          </>
        ) : (
          <span style={{ fontSize: 13, color: "#8a93a3" }}>No traffic data yet.</span>
        )}
      </div>
    </>
  );
}
