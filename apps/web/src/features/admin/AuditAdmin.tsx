import { useCallback, useEffect, useState } from "react";

import { api } from "../../lib/api";
import type { AuditLogEntry } from "@hp/shared";
import { EmptyState, ErrorState, PageHead, Pagination, friendlyError, formatTimeAgo, usePersistentState } from "./ui";

const ACTION_OPTIONS = [
  "AUTH_LOGIN_SUCCESS", "AUTH_LOGIN_FAILURE", "AUTH_LOGOUT",
  "AUTH_SESSION_REVOKED", "AUTH_PASSWORD_CHANGED",
  "AUTH_2FA_ENABLED", "AUTH_2FA_DISABLED", "AUTH_RECOVERY_CODES_REGENERATED",
  "AUTH_REAUTH_SUCCESS", "AUTH_REAUTH_FAILURE",
  "CONTENT_CREATED", "CONTENT_UPDATED", "CONTENT_DELETED",
  "MESSAGE_STATUS_CHANGED", "MESSAGE_DELETED",
  "MEDIA_UPLOADED", "MEDIA_DELETED",
];

export function AuditAdmin() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQuery] = usePersistentState("ctl:audit:q", "");
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [action, setAction] = usePersistentState("ctl:audit:action", "ALL");
  const [entity, setEntity] = usePersistentState("ctl:audit:entity", "ALL");
  const [sort, setSort] = usePersistentState<"newest" | "oldest">("ctl:audit:sort", "newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 50;

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.admin.audit({
        page,
        pageSize,
        q: debouncedQ || undefined,
        action: action !== "ALL" ? action : undefined,
        entity: entity !== "ALL" ? entity : undefined,
        sort,
      });
      setLogs(r.logs);
      setTotal(r.total);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQ, action, entity, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, action, entity, sort]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <PageHead
        title="Audit log"
        desc="Immutable security trail. Entries cannot be edited or deleted from this UI."
        actions={
          <>
            <input className="ctl-input ctl-search" placeholder="Search action, actor, entity…" value={q} onChange={(e) => setQuery(e.target.value)} aria-label="Search audit log" />
            <select className="ctl-select" value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")} style={{ width: "auto" }} aria-label="Sort audit log">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </>
        }
      />
      <div className="ctl-toolbar">
        <select className="ctl-select" value={action} onChange={(e) => setAction(e.target.value)} style={{ width: "auto" }} aria-label="Filter by action">
          <option value="ALL">All actions</option>
          {ACTION_OPTIONS.map((a) => (<option key={a} value={a}>{a}</option>))}
        </select>
        <select className="ctl-select" value={entity} onChange={(e) => setEntity(e.target.value)} style={{ width: "auto" }} aria-label="Filter by entity">
          <option value="ALL">All entities</option>
          <option value="user">user</option>
          <option value="session">session</option>
          <option value="project">project</option>
          <option value="contact_message">contact_message</option>
          <option value="media">media</option>
        </select>
        <span style={{ fontSize: 12.5, color: "#6b7280" }}>{total} events</span>
        {(q || action !== "ALL" || entity !== "ALL") && (
          <button className="ctl-mini-btn" onClick={() => { setQuery(""); setAction("ALL"); setEntity("ALL"); }}>Clear filters</button>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      <div className="ctl-table-wrap">
        {loading ? (
          <p style={{ padding: 18, color: "#8a93a3", fontSize: 13 }}>Loading audit trail…</p>
        ) : logs.length === 0 ? (
          <div style={{ padding: 12 }}><EmptyState title="No audit events" desc="Try widening your search or filters." /></div>
        ) : (
          <div>
            {logs.map((l) => (
              <div className="ctl-audit-row" key={l.id}>
                <span className="ctl-audit-action">{l.action}</span>
                <span style={{ color: "#4b5563" }}>
                  {l.entity}{l.entityId ? ` · ${l.entityId.slice(-8)}` : ""} · <span style={{ color: "#8a93a3" }}>{l.actor}</span>
                </span>
                <span className="ctl-audit-meta" title={new Date(l.createdAt).toLocaleString()}>{formatTimeAgo(l.createdAt)}{l.ip ? ` · ${l.ip}` : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <Pagination page={page} pages={pages} total={total} onPage={setPage} />
    </>
  );
}
