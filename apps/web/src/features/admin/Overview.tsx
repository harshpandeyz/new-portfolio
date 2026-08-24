import { useEffect, useState } from "react";

import { api } from "../../lib/api";
import type { SystemStats } from "@hp/shared";

export function Overview({ onUnreadChange }: { onUnreadChange: () => void }) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [analytics, setAnalytics] = useState<{ last30Days: { type: string; count: number }[]; daily: { day: string; count: number }[] } | null>(null);

  useEffect(() => {
    api.stats().then(setStats).catch(() => undefined);
    api.admin.analytics().then(setAnalytics).catch(() => undefined);
    onUnreadChange();
  }, [onUnreadChange]);

  const maxDaily = Math.max(1, ...(analytics?.daily.map((d) => d.count) ?? [1]));

  return (
    <>
      <div className="admin-head">
        <h1>System Overview</h1>
        <div className="actions">
          <a className="btn btn-sm btn-ghost" href="/" target="_blank" rel="noopener noreferrer">VIEW PUBLIC SITE ↗</a>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><b>{stats?.projects ?? "—"}</b><span>PROJECTS</span></div>
        <div className="stat-card"><b>{stats?.certificates ?? "—"}</b><span>CERTIFICATES</span></div>
        <div className="stat-card"><b>{stats?.skills ?? "—"}</b><span>SKILLS</span></div>
        <div className="stat-card"><b>{stats?.timelineItems ?? "—"}</b><span>TIMELINE ITEMS</span></div>
        <div className="stat-card"><b>{stats?.contactMessages ?? "—"}</b><span>MESSAGES</span></div>
        <div className="stat-card"><b>{stats?.unreadMessages ?? "—"}<span style={{ fontSize: 13, color: "var(--warn)" }}> NEW</span></b><span>UNREAD</span></div>
        <div className="stat-card"><b>{stats?.chatQueries ?? "—"}</b><span>CHAT QUERIES</span></div>
        <div className="stat-card"><b>{stats?.pageViews ?? "—"}</b><span>PAGE VIEWS</span></div>
      </div>

      <div className="overview-cols">
        <div className="mini-panel">
          <h3>TRAFFIC — LAST 30 DAYS (PRIVACY-SAFE COUNTS)</h3>
          {analytics && analytics.daily.length > 0 ? (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 120 }}>
              {analytics.daily.map((d) => (
                <div
                  key={d.day}
                  title={`${new Date(d.day).toLocaleDateString()}: ${d.count}`}
                  style={{
                    flex: 1,
                    height: `${(d.count / maxDaily) * 100}%`,
                    minHeight: 3,
                    background: "linear-gradient(180deg, var(--accent), rgba(139,123,255,0.25))",
                    borderRadius: 2,
                  }}
                />
              ))}
            </div>
          ) : (
            <span className="mono mono-dim">NO DATA YET</span>
          )}
          <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
            {analytics?.last30Days.map((a) => (
              <span className="mono mono-dim" key={a.type} style={{ fontSize: 9.5 }}>
                {a.type.replace(/_/g, " ")}: <b style={{ color: "var(--accent)" }}>{a.count}</b>
              </span>
            ))}
          </div>
        </div>

        <div className="mini-panel">
          <h3>OPERATIONS NOTES</h3>
          <div className="mini-list">
            <div className="ml-row"><span className="t">◆</span> Content changes appear on the public site instantly (knowledge cache: 30s).</div>
            <div className="ml-row"><span className="t">◆</span> All mutations are recorded in the audit log with your operator ID.</div>
            <div className="ml-row"><span className="t">◆</span> Media uploads: images, PDFs, MP4/WebM — max size set by MAX_UPLOAD_MB.</div>
            <div className="ml-row"><span className="t">◆</span> Draft projects stay hidden from the public API.</div>
            <div className="ml-row"><span className="t">◆</span> HARSH AI runs without an external LLM unless LLM_PROVIDER is configured.</div>
          </div>
        </div>
      </div>
    </>
  );
}
