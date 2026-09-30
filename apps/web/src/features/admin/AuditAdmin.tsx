import { useCallback, useEffect, useState } from "react";

import { api } from "../../lib/api";
import type { AuditLogEntry } from "@hp/shared";
import { AdminIcon } from "./Icon";
import { EmptyState, ErrorState, PageHead, Pagination, SearchInput, friendlyError, formatTimeAgo, usePersistentState } from "./ui";

const ACTION_OPTIONS = [
  "AUTH_LOGIN_SUCCESS", "AUTH_LOGIN_FAILURE", "AUTH_LOGOUT",
  "AUTH_SESSION_CREATED", "AUTH_SESSION_REVOKED", "AUTH_PASSWORD_CHANGED",
  "AUTH_LOGIN_2FA_REQUIRED", "AUTH_2FA_SETUP_STARTED", "AUTH_RECOVERY_CODE_USED",
  "AUTH_2FA_ENABLED", "AUTH_2FA_DISABLED", "AUTH_RECOVERY_CODES_REGENERATED",
  "AUTH_REAUTH_SUCCESS", "AUTH_REAUTH_FAILURE",
  "CONTENT_CREATED", "CONTENT_UPDATED", "CONTENT_DELETED",
  "MESSAGE_STATUS_CHANGED", "MESSAGE_DELETED",
  "MEDIA_UPLOADED", "MEDIA_REPLACED", "MEDIA_DELETED",
  "AI_PROVIDER_CREATED", "AI_PROVIDER_UPDATED", "AI_PROVIDER_DELETED", "AI_PROVIDER_TESTED", "AI_PROVIDER_KEY_ROTATED",
  "MESSAGE_RECEIVED", "MESSAGE_REPLIED", "SETTINGS_UPDATED",
];

const ACTION_LABELS: Record<string, string> = {
  AUTH_LOGIN_SUCCESS: "Signed in", AUTH_LOGIN_FAILURE: "Sign-in failed", AUTH_LOGIN_2FA_REQUIRED: "Two-step verification requested",
  AUTH_LOGOUT: "Signed out", AUTH_SESSION_CREATED: "Session started", AUTH_SESSION_REVOKED: "Session revoked",
  AUTH_PASSWORD_CHANGED: "Password changed", AUTH_2FA_SETUP_STARTED: "Two-step setup started", AUTH_2FA_ENABLED: "Two-step verification enabled",
  AUTH_2FA_DISABLED: "Two-step verification disabled", AUTH_RECOVERY_CODES_REGENERATED: "Recovery codes regenerated", AUTH_RECOVERY_CODE_USED: "Recovery code used",
  AUTH_REAUTH_SUCCESS: "Identity rechecked", AUTH_REAUTH_FAILURE: "Identity check failed", CONTENT_CREATED: "Content created",
  CONTENT_UPDATED: "Content updated", CONTENT_DELETED: "Content deleted", MESSAGE_RECEIVED: "Message received", MESSAGE_REPLIED: "Reply sent",
  MESSAGE_STATUS_CHANGED: "Message status changed", MESSAGE_DELETED: "Message deleted", MEDIA_UPLOADED: "Media uploaded",
  MEDIA_REPLACED: "Media replaced", MEDIA_DELETED: "Media deleted", SETTINGS_UPDATED: "Settings updated",
  AI_PROVIDER_CREATED: "AI provider added", AI_PROVIDER_UPDATED: "AI provider updated", AI_PROVIDER_DELETED: "AI provider removed",
  AI_PROVIDER_TESTED: "AI provider tested", AI_PROVIDER_KEY_ROTATED: "AI provider key rotated",
};

function eventTone(action: string): "danger" | "success" | "neutral" {
  if (action.includes("FAILURE") || action.includes("DELETED") || action === "AUTH_2FA_DISABLED") return "danger";
  if (action.includes("SUCCESS") || action.includes("CREATED") || action.includes("ENABLED") || action === "MESSAGE_REPLIED") return "success";
  return "neutral";
}

function entityLabel(entity: string) {
  return entity.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

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
            <SearchInput value={q} onChange={setQuery} label="Search audit log" placeholder="Search action, actor, entity…" />
            <select className="ctl-select ctl-select--auto" value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")} aria-label="Sort audit log">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </>
        }
      />
      <div className="ctl-toolbar">
        <select className="ctl-select ctl-select--auto" value={action} onChange={(e) => setAction(e.target.value)} aria-label="Filter by action">
          <option value="ALL">All actions</option>
          {ACTION_OPTIONS.map((a) => (<option key={a} value={a}>{a}</option>))}
        </select>
        <select className="ctl-select ctl-select--auto" value={entity} onChange={(e) => setEntity(e.target.value)} aria-label="Filter by entity">
          <option value="ALL">All entities</option>
          <option value="user">user</option>
          <option value="session">session</option>
          <option value="project">project</option>
          <option value="contact_message">contact_message</option>
          <option value="media">media</option>
        </select>
        <span className="ctl-muted">{total} events</span>
        {(q || action !== "ALL" || entity !== "ALL") && (
          <button className="ctl-mini-btn" onClick={() => { setQuery(""); setAction("ALL"); setEntity("ALL"); }}>Clear filters</button>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      <div className="ctl-audit-list" aria-label="Audit activity timeline">
        {loading ? (
          <p className="ctl-audit-loading">Loading audit trail…</p>
        ) : logs.length === 0 ? (
          <EmptyState title="No audit events" desc="Try widening your search or filters." />
        ) : (
          logs.map((l) => <article className={`ctl-audit-row ctl-audit-row--${eventTone(l.action)}`} key={l.id}>
            <span className="ctl-audit-icon"><AdminIcon name={eventTone(l.action) === "danger" ? "alert" : eventTone(l.action) === "success" ? "check" : "activity"} size={16} /></span>
            <div className="ctl-audit-content"><div className="ctl-audit-title"><strong>{ACTION_LABELS[l.action] ?? l.action.replaceAll("_", " ").toLowerCase()}</strong><span>{entityLabel(l.entity)}</span></div>
              <p>{typeof l.meta?.title === "string" ? l.meta.title : typeof l.meta?.name === "string" ? l.meta.name : typeof l.meta?.degree === "string" ? l.meta.degree : typeof l.meta?.filename === "string" ? l.meta.filename : l.entityId ? `Record ${l.entityId.slice(-8)}` : "System setting"}</p>
              <small>By {l.actor}</small>
            </div>
            <time className="ctl-audit-meta" dateTime={l.createdAt} title={new Date(l.createdAt).toLocaleString()}>{formatTimeAgo(l.createdAt)}</time>
            {(l.meta || l.ip || l.entityId) && <details className="ctl-audit-details"><summary>Details</summary><dl>{l.entityId && <><dt>Record ID</dt><dd>{l.entityId}</dd></>}{l.ip && <><dt>IP address</dt><dd>{l.ip}</dd></>}{l.meta && <><dt>Event data</dt><dd><pre>{JSON.stringify(l.meta, null, 2)}</pre></dd></>}</dl></details>}
          </article>)
        )}
      </div>
      <Pagination page={page} pages={pages} total={total} onPage={setPage} />
    </>
  );
}
