import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { api } from "../../lib/api";
import type { ContactMessage, MessageReply } from "@hp/shared";
import {
  Badge, ConfirmDialog, EmptyState, ErrorState, Field, PageHead, Pagination, SearchInput, Segmented,
  SkeletonList, friendlyError, formatTimeAgo, isTestMessage, useDebouncedValue, usePersistentState, useToast,
} from "./ui";
import { adminBus } from "./bus";

const STATUSES = ["NEW", "READ", "REPLIED", "ARCHIVED", "SPAM"] as const;
type StatusFilter = "ALL" | (typeof STATUSES)[number];

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
  const [statusFilter, setStatusFilter] = usePersistentState<StatusFilter>("ctl:msg:status", "ALL");
  const [query, setQuery] = usePersistentState("ctl:msg:q", "");
  const [sort, setSort] = usePersistentState<"newest" | "oldest">("ctl:msg:sort", "newest");
  const [hideTests, setHideTests] = usePersistentState("ctl:msg:hideTests", true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ContactMessage | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { push } = useToast();
  const pageSize = 25;

  // Direct-reply composer + sent history for the open message.
  const [replies, setReplies] = useState<MessageReply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  // Ref guard: state updates are async, so fast double-clicks could otherwise
  // fire two POSTs before the disabled button re-renders.
  const replySending = useRef(false);

  const debouncedQ = useDebouncedValue(query.trim(), 300);
  const openId = searchParams.get("open");
  const statusParam = searchParams.get("status");

  // Deep-link ?status=NEW from the overview attention card. Consumes the
  // param so back/forward stays coherent; re-runs if navigated again.
  useEffect(() => {
    if (statusParam && (statusParam === "ALL" || (STATUSES as readonly string[]).includes(statusParam))) {
      setStatusFilter(statusParam as StatusFilter);
      setPage(1);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("status");
        return next;
      }, { replace: true });
    }
  }, [statusParam, setSearchParams]);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.admin.messages({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        page,
        q: debouncedQ || undefined,
        sort: sort === "oldest" ? "oldest" : undefined,
      });
      if (signal?.aborted) return;
      setMessages(r.messages);
      setTotal(r.total);
      // Preserve selection for rows still on screen; drop the rest.
      setSelected((prev) => {
        const ids = new Set(r.messages.map((m) => m.id));
        const next = new Set([...prev].filter((id) => ids.has(id)));
        return next.size === prev.size ? prev : next;
      });
    } catch (e) {
      if (!signal?.aborted) setError(friendlyError(e));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
    if (!signal?.aborted) onChange();
  }, [statusFilter, page, debouncedQ, sort, onChange]);

  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load]);

  const resetPageOnSearch = useCallback(() => setPage(1), []);
  useEffect(() => {
    resetPageOnSearch();
  }, [debouncedQ, resetPageOnSearch]);

  const pages = Math.max(1, Math.ceil(total / pageSize));
  // Detail fallback: when ?open= points off-page (another page, filtered out,
  // or hideTests), fall back to the fetched detail instead of a dead pane.
  const [detail, setDetail] = useState<ContactMessage | null>(null);
  const openMsg = openId ? (messages.find((m) => m.id === openId) ?? (detail?.id === openId ? detail : null)) : null;

  // Load full detail (incl. sent replies) whenever a message is opened.
  // The list rows don't carry replies; the composer needs them for history.
  // A fresh conversation resets the composer; the fetched detail only fills
  // an untouched subject (deep-link before the list loads).
  useEffect(() => {
    if (!openId) {
      setReplies([]);
      setDetail(null);
      setReplySubject("");
      setReplyBody("");
      setReplyError(null);
      setRepliesLoading(false);
      return;
    }
    const current = messages.find((m) => m.id === openId);
    setReplySubject(current ? `Re: ${current.subject?.trim() || "your message"}` : "");
    setReplyBody("");
    setReplyError(null);
    let live = true;
    setRepliesLoading(true);
    api.admin
      .message(openId)
      .then((r) => {
        if (!live) return;
        setReplies(r.message.replies ?? []);
        setDetail(r.message);
        if (r.message.subject) {
          const fallback = `Re: ${r.message.subject.trim() || "your message"}`;
          setReplySubject((prev) => (prev === "" ? fallback : prev));
        }
      })
      .catch(() => {
        if (!live) return;
        setReplies([]);
        setDetail(null);
      })
      .finally(() => {
        if (live) setRepliesLoading(false);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  const { visible, hiddenTests } = useMemo(() => {
    if (!hideTests) return { visible: messages, hiddenTests: 0 };
    const kept = messages.filter((m) => !isTestMessage(m));
    return { visible: kept, hiddenTests: messages.length - kept.length };
  }, [messages, hideTests]);

  const setOpen = useCallback((id: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set("open", id);
      else next.delete("open");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setStatus = useCallback(async (m: ContactMessage, status: ContactMessage["status"]) => {
    const prev = m.status;
    setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, status } : x)));
    setBusyId(m.id);
    try {
      await api.admin.setMessageStatus(m.id, status);
      push({ kind: "success", title: `Marked as ${status.toLowerCase()}` });
      onChange();
    } catch (e) {
      setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, status: prev } : x)));
      push({ kind: "error", title: "Update failed", desc: friendlyError(e) });
    } finally {
      setBusyId(null);
    }
  }, [push, onChange]);

  const remove = async (m: ContactMessage) => {
    setBusyId(m.id);
    try {
      await api.admin.deleteMessage(m.id);
      setConfirmDelete(null);
      if (openId === m.id) setOpen(null);
      setMessages((list) => list.filter((x) => x.id !== m.id));
      setTotal((t) => Math.max(0, t - 1));
      push({ kind: "success", title: "Message deleted" });
      onChange();
    } catch (e) {
      push({ kind: "error", title: "Delete failed", desc: friendlyError(e) });
    } finally {
      setBusyId(null);
    }
  };

  const sendReply = async (m: ContactMessage) => {
    if (replySending.current || replyBusy) return;
    const body = replyBody.trim();
    if (body.length < 2) {
      setReplyError("Write your reply first — a couple of characters is enough.");
      return;
    }
    replySending.current = true;
    setReplyBusy(true);
    setReplyError(null);
    try {
      const r = await api.admin.replyToMessage(m.id, {
        subject: replySubject.trim() || `Re: ${m.subject?.trim() || "your message"}`,
        body,
      });
      setReplies((prev) => [...prev, r.reply]);
      setMessages((list) =>
        list.map((x) => (x.id === m.id ? { ...x, status: "REPLIED", repliedAt: r.message.repliedAt ?? new Date().toISOString() } : x)),
      );
      setReplyBody("");
      push({ kind: "success", title: "Reply sent", desc: `Sent to ${m.email}` });
      onChange();
    } catch (e) {
      const msg = friendlyError(e);
      setReplyError(
        /EMAIL_NOT_CONFIGURED|SMTP_NOT_CONFIGURED|not configured/i.test(msg)
          ? "Email sending isn't configured yet. Add RESEND_API_KEY + EMAIL_FROM (production) or SMTP_* in server env, then try again."
          : msg,
      );
    } finally {
      replySending.current = false;
      setReplyBusy(false);
    }
  };

  const bulkStatus = useCallback(async (status: ContactMessage["status"]) => {
    const list = [...selected];
    if (list.length === 0 || bulkBusy) return;
    setBulkBusy(true);
    const prevMap = new Map(messages.filter((m) => selected.has(m.id)).map((m) => [m.id, m.status]));
    setMessages((rows) => rows.map((x) => (selected.has(x.id) ? { ...x, status } : x)));
    try {
      const r = await api.admin.bulkMessageStatus(list, status);
      push({ kind: "success", title: `Updated ${r.count} message${r.count === 1 ? "" : "s"}` });
      onChange();
    } catch (e) {
      setMessages((rows) => rows.map((x) => {
        const prev = prevMap.get(x.id);
        return prev !== undefined ? { ...x, status: prev } : x;
      }));
      push({ kind: "error", title: "Bulk update failed", desc: friendlyError(e) });
    } finally {
      setBulkBusy(false);
    }
  }, [selected, bulkBusy, messages, push, onChange]);

  const bulkDelete = async () => {
    if (selected.size === 0 || bulkBusy) return;
    setBulkBusy(true);
    try {
      const r = await api.admin.bulkMessageDelete([...selected]);
      push({ kind: "success", title: `Deleted ${r.count} message${r.count === 1 ? "" : "s"}` });
      setConfirmBulkDelete(false);
      setOpen(null);
      setSelected(new Set());
      void load();
    } catch (e) {
      push({ kind: "error", title: "Bulk delete failed", desc: friendlyError(e) });
    } finally {
      setBulkBusy(false);
    }
  };

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
  const activeIndex = openId ? visible.findIndex((m) => m.id === openId) : -1;

  const moveOpen = useCallback((dir: 1 | -1) => {
    if (visible.length === 0) return;
    const idx = activeIndex;
    const next = visible[Math.min(visible.length - 1, Math.max(0, (idx < 0 ? (dir === 1 ? -1 : 0) : idx) + dir))];
    if (next) setOpen(next.id);
  }, [visible, activeIndex, setOpen]);

  const listRef = useRef<HTMLDivElement>(null);

  const clearSearch = () => {
    setQuery("");
    setStatusFilter("ALL");
    setPage(1);
    setOpen(null);
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <>
      <PageHead
        title="Messages"
        desc={`${total} message${total === 1 ? "" : "s"}${hideTests && hiddenTests > 0 ? ` · ${hiddenTests} test${hiddenTests === 1 ? "" : "s"} hidden` : ""} · bodies render as plain text only.`}
        actions={
          <>
            <SearchInput value={query} onChange={(v) => setQuery(v)} label="Search messages" placeholder="Search name, email, subject…" />
            <select className="ctl-select" value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")} aria-label="Sort messages" style={{ width: "auto" }}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </>
        }
      />

      <div className="ctl-list-toolbar">
        {/* Filter handlers setPage(1) inline so React batches filter+page into
            one render and one fetch; only debounced search resets via effect. */}
        <Segmented options={["ALL", ...STATUSES]} value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} label="Filter by status" />
        <label className="ctl-check" title="Automated E2E probes are tagged [E2E] and hidden by default">
          <input type="checkbox" checked={hideTests} onChange={(e) => setHideTests(e.target.checked)} />
          Hide tests{hiddenTests > 0 ? ` (${hiddenTests})` : ""}
        </label>
        {selected.size > 0 && (
          <div className="ctl-bulkbar" role="toolbar" aria-label="Bulk actions">
            <span>{selected.size} selected</span>
            <button type="button" className="ctl-mini-btn" disabled={bulkBusy} onClick={() => void bulkStatus("READ")}>Mark read</button>
            <button type="button" className="ctl-mini-btn" disabled={bulkBusy} onClick={() => void bulkStatus("REPLIED")}>Replied</button>
            <button type="button" className="ctl-mini-btn" disabled={bulkBusy} onClick={() => void bulkStatus("ARCHIVED")}>Archive</button>
            <button type="button" className="ctl-mini-btn" disabled={bulkBusy} onClick={() => void bulkStatus("SPAM")}>Spam</button>
            <button type="button" className="ctl-mini-btn danger" disabled={bulkBusy} onClick={() => setConfirmBulkDelete(true)}>Delete</button>
            <button type="button" className="ctl-mini-btn" disabled={bulkBusy} onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      <div className="ctl-inbox">
        <div ref={listRef}>
          <label className="ctl-selectpage">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={(e) => setSelected(e.target.checked ? new Set(allIds) : new Set())}
              aria-label="Select all messages on this page"
            />
            Select page
          </label>
          {loading && messages.length === 0 ? (
            <SkeletonList rows={6} />
          ) : visible.length === 0 ? (
            <EmptyState
              title={debouncedQ ? `No results for “${debouncedQ}”` : "No messages"}
              desc={debouncedQ ? "Try a different search, or clear filters." : statusFilter !== "ALL" ? `Nothing with status ${statusFilter}.` : "New contact messages will land here."}
              action={debouncedQ || statusFilter !== "ALL" ? <button type="button" className="ctl-btn ctl-btn--secondary ctl-btn--sm" onClick={clearSearch}>Clear search</button> : undefined}
            />
          ) : (
            <div
              className="ctl-msg-list"
              role="listbox"
              aria-label="Messages"
              aria-activedescendant={openId ? `msg-${openId}` : undefined}
              tabIndex={0}
              onKeyDown={(e) => {
                const tag = (e.target as HTMLElement).tagName;
                if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
                if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); moveOpen(1); }
                else if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); moveOpen(-1); }
                else if (e.key === "Escape") { setOpen(null); }
                else if (e.key === "e" && openMsg) { void setStatus(openMsg, "ARCHIVED"); }
                else if (e.key === "a" && openMsg) { void setStatus(openMsg, openMsg.status === "NEW" ? "READ" : "NEW"); }
              }}
            >
              {visible.map((m) => {
                const isOpen = openId === m.id;
                const isChecked = selected.has(m.id);
                return (
                  <div
                    key={m.id}
                    id={`msg-${m.id}`}
                    role="option"
                    aria-selected={isOpen}
                    className={`ctl-msg-item${isOpen ? " active" : ""}${m.status === "NEW" ? " unread" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="ctl-msg-checkbox"
                      checked={isChecked}
                      onChange={(e) => toggleSelect(m.id, e.target.checked)}
                      aria-label={`Select message from ${m.name}`}
                    />
                    <button
                      type="button"
                      className="ctl-msg-open"
                      onClick={() => setOpen(isOpen ? null : m.id)}
                      aria-label={`${isOpen ? "Close" : "Open"} message from ${m.name}, ${m.status}, ${formatTimeAgo(m.createdAt)}`}
                    >
                      <span className={`ctl-unread-dot${m.status === "NEW" ? "" : " read"}`} aria-hidden="true" />
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span className="ctl-msg-top">
                          <b>{m.name}</b>
                          <Badge tone={toneFor(m.status)}>{m.status}</Badge>
                          <time dateTime={m.createdAt} title={new Date(m.createdAt).toLocaleString()}>{formatTimeAgo(m.createdAt)}</time>
                        </span>
                        <span className="ctl-msg-sub">{m.subject || m.message.slice(0, 90)}</span>
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <Pagination page={page} pages={pages} total={total} onPage={setPage} />
        </div>

        <div className={`ctl-detail${openMsg ? " open" : ""}`} aria-live="polite">
          {!openMsg ? (
            openId && !loading ? (
              <EmptyState
                title="Message isn't on this page"
                desc="It may be on another page or hidden by the current filters."
                action={<button type="button" className="ctl-btn ctl-btn--secondary ctl-btn--sm" onClick={() => { clearSearch(); setOpen(null); }}>Show all messages</button>}
              />
            ) : (
              <EmptyState title="Select a message" desc="Choose a message to read it, reply, or change its status. Press ↑ ↓ to move through the list." />
            )
          ) : (
            <>
              <button type="button" className="ctl-back-btn" onClick={() => setOpen(null)}>← All messages</button>
              <div className="ctl-detail-nav" role="toolbar" aria-label="Conversation navigation">
                <button
                  type="button"
                  className="ctl-mini-btn"
                  disabled={activeIndex <= 0}
                  onClick={() => moveOpen(-1)}
                  aria-label="Previous message (↑ or k)"
                >
                  ↑ Prev
                </button>
                <span aria-live="polite" style={{ fontSize: 12, color: "#8a93a3" }}>
                  {activeIndex >= 0 ? `${activeIndex + 1} of ${visible.length}` : ""}
                </span>
                <button
                  type="button"
                  className="ctl-mini-btn"
                  disabled={activeIndex < 0 || activeIndex >= visible.length - 1}
                  onClick={() => moveOpen(1)}
                  aria-label="Next message (↓ or j)"
                >
                  Next ↓
                </button>
              </div>
              <div className="ctl-detail-head">
                <h2>{openMsg.subject || "No subject"}</h2>
                <Badge tone={toneFor(openMsg.status)}>{openMsg.status}</Badge>
              </div>
              <div className="ctl-detail-meta">
                <div><b>{openMsg.name}</b> <span>{openMsg.email}</span></div>
                <time dateTime={openMsg.createdAt} title={new Date(openMsg.createdAt).toLocaleString()}>
                  {formatTimeAgo(openMsg.createdAt)} · {new Date(openMsg.createdAt).toLocaleString()}
                </time>
                {openMsg.repliedAt && (
                  <span>Last replied {formatTimeAgo(openMsg.repliedAt)}</span>
                )}
              </div>
              <div className="ctl-detail-body">{openMsg.message}</div>
              <div className="ctl-reply" aria-label="Reply directly by email">
                <h3>Reply directly</h3>
                <p className="ctl-reply-hint">Sends from your private section straight to {openMsg.email} — no mail app opens.</p>
                <Field label="Subject" hint={`Replies from Harsh Pandey`}>
                  {(id) => (
                    <input
                      id={id}
                      className="ctl-input"
                      value={replySubject}
                      maxLength={140}
                      onChange={(e) => setReplySubject(e.target.value)}
                      placeholder={`Re: ${openMsg.subject ?? "your message"}`}
                    />
                  )}
                </Field>
                <Field label="Message" required error={replyError ?? undefined} hint={`${replyBody.length}/4000`}>
                  {(id) => (
                    <textarea
                      id={id}
                      className="ctl-textarea"
                      rows={5}
                      minLength={2}
                      maxLength={4000}
                      required
                      aria-invalid={Boolean(replyError)}
                      value={replyBody}
                      onChange={(e) => {
                        setReplyBody(e.target.value);
                        if (replyError) setReplyError(null);
                      }}
                      placeholder={`Hi ${openMsg.name}, thanks for reaching out…`}
                    />
                  )}
                </Field>
                <div className="ctl-detail-actions">
                  <button
                    type="button"
                    className="ctl-btn ctl-btn--primary ctl-btn--sm"
                    disabled={replyBusy || replyBody.trim().length < 2}
                    onClick={() => void sendReply(openMsg)}
                  >
                    {replyBusy ? "Sending… (do not close)" : `Send reply to ${openMsg.email}`}
                  </button>
                  {replyError && (
                    <button
                      type="button"
                      className="ctl-btn ctl-btn--secondary ctl-btn--sm"
                      disabled={replyBusy || replyBody.trim().length < 2}
                      onClick={() => void sendReply(openMsg)}
                    >
                      Retry send
                    </button>
                  )}
                </div>
              </div>
              {repliesLoading ? (
                <p style={{ color: "#8a93a3", fontSize: 13 }}>Loading sent replies…</p>
              ) : replies.length > 0 ? (
                <div className="ctl-reply-history" aria-label="Sent replies">
                  <h3>SENT ({replies.length})</h3>
                  {replies.map((r) => (
                    <div key={r.id} className="ctl-reply-item">
                      <div className="ctl-reply-item-head">
                        <b>{r.subject}</b>
                        <time dateTime={r.sentAt} title={new Date(r.sentAt).toLocaleString()}>
                          {formatTimeAgo(r.sentAt)}
                        </time>
                      </div>
                      <div className="ctl-reply-item-to">to {r.to}{r.sentBy ? ` · sent by ${r.sentBy}` : ""}</div>
                      <p>{r.body}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="ctl-detail-actions">
                {openMsg.status === "NEW" && (
                  <button type="button" className="ctl-btn ctl-btn--secondary ctl-btn--sm" disabled={busyId === openMsg.id} onClick={() => void setStatus(openMsg, "READ")}>
                    {busyId === openMsg.id ? "Working…" : "Mark as read"}
                  </button>
                )}
                {openMsg.status !== "ARCHIVED" && <button type="button" className="ctl-btn ctl-btn--ghost ctl-btn--sm" disabled={busyId === openMsg.id} onClick={() => void setStatus(openMsg, "ARCHIVED")}>Archive</button>}
              </div>
              <div className="ctl-detail-actions ctl-detail-actions--quiet">
                {openMsg.status !== "REPLIED" && <button type="button" className="ctl-mini-btn" disabled={busyId === openMsg.id} onClick={() => void setStatus(openMsg, "REPLIED")}>Mark replied</button>}
                {openMsg.status !== "SPAM" && <button type="button" className="ctl-mini-btn" disabled={busyId === openMsg.id} onClick={() => void setStatus(openMsg, "SPAM")}>Mark spam</button>}
                {(openMsg.status === "ARCHIVED" || openMsg.status === "SPAM") && <button type="button" className="ctl-mini-btn" disabled={busyId === openMsg.id} onClick={() => void setStatus(openMsg, "READ")}>Back to inbox</button>}
                <a className="ctl-mini-btn" href={`mailto:${openMsg.email}?subject=${encodeURIComponent(`Re: ${openMsg.subject ?? "your message"}`)}`} title="Emergency fallback — opens your mail app">Open in mail app</a>
                <button type="button" className="ctl-mini-btn danger" disabled={busyId === openMsg.id} onClick={() => setConfirmDelete(openMsg)}>Delete…</button>
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
        busy={busyId === confirmDelete?.id}
      />
      <ConfirmDialog
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={() => void bulkDelete()}
        title={`Delete ${selected.size} messages?`}
        description="Bulk delete is permanent. Archived or spam messages can be filtered instead."
        confirmLabel={`Delete ${selected.size}`}
        busy={bulkBusy}
      />
    </>
  );
}
