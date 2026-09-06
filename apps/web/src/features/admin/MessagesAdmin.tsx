import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "../../lib/api";
import type { ContactMessage } from "@hp/shared";
import {
  Badge, ConfirmDialog, EmptyState, ErrorState, PageHead, Pagination,
  friendlyError, formatTimeAgo, isTestMessage, usePersistentState, useToast,
} from "./ui";
import { adminBus } from "./bus";

const STATUSES = ["NEW", "READ", "REPLIED", "ARCHIVED", "SPAM"] as const;

function toneFor(s: string) {
  if (s === "NEW") return "blue" as const;
  if (s === "READ") return "neutral" as const;
  if (s === "REPLIED") return "green" as const;
  if (s === "SPAM") return "red" as const;
  return "gray" as const;
}

export function MessagesAdmin({ onChange }: { onChange: () => void }) {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = usePersistentState("ctl:msg:status", "ALL");
  const [query, setQuery] = usePersistentState("ctl:msg:q", "");
  const [debouncedQ, setDebouncedQ] = useState(query);
  const [sort, setSort] = usePersistentState<"newest" | "oldest">("ctl:msg:sort", "newest");
  const [hideTests, setHideTests] = usePersistentState("ctl:msg:hideTests", true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ContactMessage | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const { push } = useToast();
  const pageSize = 25;

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(query.trim()), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.admin.messages({
        status: statusFilter,
        page,
        q: debouncedQ || undefined,
        sort: sort === "oldest" ? "oldest" : undefined,
      });
      setMessages(r.messages);
      setTotal(r.total);
      setSelected(new Set());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
    onChange();
  }, [statusFilter, page, debouncedQ, sort, onChange]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedQ]);

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const openMsg = openId ? (messages.find((m) => m.id === openId) ?? null) : null;

  // Client-side test-message filter (E2E probes must never hide real mail).
  const { visible, hiddenTests } = useMemo(() => {
    if (!hideTests) return { visible: messages, hiddenTests: 0 };
    const kept = messages.filter((m) => !isTestMessage(m));
    return { visible: kept, hiddenTests: messages.length - kept.length };
  }, [messages, hideTests]);

  const setStatus = async (m: ContactMessage, status: string, silent = false) => {
    try {
      await api.admin.setMessageStatus(m.id, status);
      if (!silent) push({ kind: "success", title: `Marked as ${status.toLowerCase()}` });
      void load();
    } catch (e) {
      push({ kind: "error", title: "Update failed", desc: friendlyError(e) });
    }
  };

  const remove = async (m: ContactMessage) => {
    setBusy(true);
    try {
      await api.admin.deleteMessage(m.id);
      setConfirmDelete(null);
      if (openId === m.id) setOpenId(null);
      push({ kind: "success", title: "Message deleted" });
      void load();
    } catch (e) {
      push({ kind: "error", title: "Delete failed", desc: friendlyError(e) });
    } finally {
      setBusy(false);
    }
  };

  const bulkStatus = useCallback(async (status: string, ids?: Set<string>) => {
    const list = [...(ids ?? selected)];
    if (list.length === 0) return;
    try {
      const r = await api.admin.bulkMessageStatus(list, status);
      push({ kind: "success", title: `Updated ${r.count} message${r.count === 1 ? "" : "s"}` });
      void load();
    } catch (e) {
      push({ kind: "error", title: "Bulk update failed", desc: friendlyError(e) });
    }
  }, [selected, push, load]);

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const r = await api.admin.bulkMessageDelete([...selected]);
      push({ kind: "success", title: `Deleted ${r.count} message${r.count === 1 ? "" : "s"}` });
      setConfirmBulkDelete(false);
      setOpenId(null);
      void load();
    } catch (e) {
      push({ kind: "error", title: "Bulk delete failed", desc: friendlyError(e) });
    } finally {
      setBusy(false);
    }
  };

  // Palette + shell integration: contextual triage for the current selection.
  useEffect(() => {
    adminBus.registerTriage({
      selectedCount: selected.size,
      markSelectedRead: () => void bulkStatus("READ"),
      archiveSelected: () => void bulkStatus("ARCHIVED"),
    });
    return () => adminBus.registerTriage(null);
  }, [selected.size, bulkStatus]);

  const allIds = useMemo(() => visible.map((m) => m.id), [visible]);
  const allChecked = allIds.length > 0 && allIds.every((id) => selected.has(id));

  const openDetail = async (m: ContactMessage) => {
    setOpenId(m.id);
    if (m.status === "NEW") {
      // Read-on-open: one click does open + triage.
      try {
        await api.admin.setMessageStatus(m.id, "READ");
        setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: "READ" } : x)));
        onChange();
      } catch {
        /* non-fatal — message stays readable */
      }
    }
  };

  // Keyboard: ↑/↓ moves through the list, Escape steps back.
  const moveOpen = (dir: 1 | -1) => {
    if (visible.length === 0) return;
    const idx = visible.findIndex((m) => m.id === openId);
    const next = visible[Math.min(visible.length - 1, Math.max(0, (idx < 0 ? (dir === 1 ? -1 : 0) : idx) + dir))];
    if (next) void openDetail(next);
  };

  const clearSearch = () => {
    setQuery("");
    setStatusFilter("ALL");
  };

  return (
    <>
      <PageHead
        title="Messages"
        desc={`${total} message${total === 1 ? "" : "s"} · bodies render as plain text only.`}
        actions={
          <>
            <input
              className="ctl-input ctl-search"
              placeholder="Search name, email, subject…  ( / )"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search messages"
            />
            <select className="ctl-select" value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")} aria-label="Sort messages" style={{ width: "auto" }}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </>
        }
      />

      <div className="ctl-toolbar">
        <div className="ctl-segment" role="group" aria-label="Filter by status">
          {["ALL", ...STATUSES].map((s) => (
            <button key={s} className={`ctl-seg-btn${statusFilter === s ? " active" : ""}`} onClick={() => setStatusFilter(s)} aria-pressed={statusFilter === s}>{s}</button>
          ))}
        </div>
        <label className="ctl-check" title="Automated E2E probes are tagged [E2E] and hidden by default">
          <input type="checkbox" checked={hideTests} onChange={(e) => setHideTests(e.target.checked)} />
          Hide tests{hiddenTests > 0 ? ` (${hiddenTests})` : ""}
        </label>
        {selected.size > 0 && (
          <div className="ctl-bulkbar" role="toolbar" aria-label="Bulk actions">
            <span>{selected.size} selected</span>
            <button className="ctl-mini-btn" onClick={() => void bulkStatus("READ")}>Mark read</button>
            <button className="ctl-mini-btn" onClick={() => void bulkStatus("REPLIED")}>Replied</button>
            <button className="ctl-mini-btn" onClick={() => void bulkStatus("ARCHIVED")}>Archive</button>
            <button className="ctl-mini-btn" onClick={() => void bulkStatus("SPAM")}>Spam</button>
            <button className="ctl-mini-btn danger" onClick={() => setConfirmBulkDelete(true)}>Delete</button>
            <button className="ctl-mini-btn" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      <div className="ctl-inbox">
        <div
          className="ctl-msg-list"
          tabIndex={0}
          aria-label="Message list. Use up and down arrows to move."
          onKeyDown={(e) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
            if (e.key === "ArrowDown") { e.preventDefault(); moveOpen(1); }
            else if (e.key === "ArrowUp") { e.preventDefault(); moveOpen(-1); }
            else if (e.key === "Escape") setSelected(new Set());
          }}
        >
          <label className="ctl-selectpage">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={(e) => setSelected(e.target.checked ? new Set(allIds) : new Set())}
              aria-label="Select all messages on this page"
            />
            Select page
          </label>
          {loading ? (
            <div className="ctl-card"><p style={{ color: "#8a93a3", fontSize: 13 }}>Loading messages…</p></div>
          ) : visible.length === 0 ? (
            <EmptyState
              title={debouncedQ ? `No results for “${debouncedQ}”` : "No messages"}
              desc={debouncedQ ? "Try a different search, or clear filters." : statusFilter !== "ALL" ? `Nothing with status ${statusFilter}.` : "New contact messages will land here."}
              action={debouncedQ || statusFilter !== "ALL" ? <button className="ctl-btn ctl-btn--secondary ctl-btn--sm" onClick={clearSearch}>Clear search</button> : undefined}
            />
          ) : (
            visible.map((m) => (
              <div key={m.id} className={`ctl-msg-item${openId === m.id ? " active" : ""}${m.status === "NEW" ? " unread" : ""}`} role="button" tabIndex={0}
                onClick={() => void openDetail(m)}
                onKeyDown={(e) => { if (e.key === "Enter") void openDetail(m); }}
                aria-label={`Message from ${m.name}, ${m.status}, ${formatTimeAgo(m.createdAt)}`}>
                <input
                  type="checkbox"
                  checked={selected.has(m.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(m.id);
                      else next.delete(m.id);
                      return next;
                    });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select message from ${m.name}`}
                />
                <span className={`ctl-unread-dot${m.status === "NEW" ? "" : " read"}`} aria-hidden="true" />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="ctl-msg-top">
                    <b>{m.name}</b>
                    <Badge tone={toneFor(m.status)}>{m.status}</Badge>
                    <time dateTime={m.createdAt} title={new Date(m.createdAt).toLocaleString()}>{formatTimeAgo(m.createdAt)}</time>
                  </div>
                  <div className="ctl-msg-sub">{m.subject || m.message.slice(0, 90)}</div>
                </div>
              </div>
            ))
          )}
          <Pagination page={page} pages={pages} total={total} onPage={setPage} />
        </div>

        <div className={`ctl-detail${openMsg ? " open" : ""}`} aria-live="polite">
          {!openMsg ? (
            <EmptyState title="Select a message" desc="Choose a message to read it, reply, or change its status. Press ↑ ↓ to move through the list." />
          ) : (
            <>
              <button className="ctl-back-btn" onClick={() => setOpenId(null)}>← All messages</button>
              <div className="ctl-detail-head">
                <h2>{openMsg.subject || "No subject"}</h2>
                <Badge tone={toneFor(openMsg.status)}>{openMsg.status}</Badge>
              </div>
              <div className="ctl-detail-meta">
                <div><b>{openMsg.name}</b> <span>{openMsg.email}</span></div>
                <time dateTime={openMsg.createdAt} title={new Date(openMsg.createdAt).toLocaleString()}>
                  {formatTimeAgo(openMsg.createdAt)} · {new Date(openMsg.createdAt).toLocaleString()}
                </time>
              </div>
              <div className="ctl-detail-body">{openMsg.message}</div>
              <div className="ctl-detail-actions">
                <a className="ctl-btn ctl-btn--primary ctl-btn--sm" href={`mailto:${encodeURIComponent(openMsg.email)}?subject=${encodeURIComponent(`Re: ${openMsg.subject ?? "your message"}`)}`}>Reply via email</a>
                {openMsg.status !== "REPLIED" && <button className="ctl-btn ctl-btn--secondary ctl-btn--sm" onClick={() => void setStatus(openMsg, "REPLIED")}>Mark replied</button>}
                {openMsg.status !== "ARCHIVED" && <button className="ctl-btn ctl-btn--ghost ctl-btn--sm" onClick={() => void setStatus(openMsg, "ARCHIVED")}>Archive</button>}
              </div>
              <div className="ctl-detail-actions ctl-detail-actions--quiet">
                {openMsg.status !== "SPAM" && <button className="ctl-mini-btn" onClick={() => void setStatus(openMsg, "SPAM")}>Mark spam</button>}
                {(openMsg.status === "ARCHIVED" || openMsg.status === "SPAM") && <button className="ctl-mini-btn" onClick={() => void setStatus(openMsg, "READ")}>Back to inbox</button>}
                <button className="ctl-mini-btn danger" onClick={() => setConfirmDelete(openMsg)}>Delete…</button>
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => { if (confirmDelete) void remove(confirmDelete); }}
        title={`Delete message from ${confirmDelete?.name ?? ""}?`}
        description="This permanently removes the message. This cannot be undone."
        confirmLabel="Delete message"
        busy={busy}
      />
      <ConfirmDialog
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={() => void bulkDelete()}
        title={`Delete ${selected.size} messages?`}
        description="Bulk delete is permanent. Archived or spam messages can be filtered instead."
        confirmLabel={`Delete ${selected.size}`}
        busy={busy}
      />
    </>
  );
}
