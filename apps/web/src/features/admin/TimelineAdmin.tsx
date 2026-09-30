import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { api } from "../../lib/api";
import type { TimelineItem } from "@hp/shared";
import { AdminIcon } from "./Icon";
import { Badge, ConfirmDialog, Dialog, EmptyState, ErrorState, PageHead, SearchInput, SkeletonList, friendlyError, usePersistentState, useToast } from "./ui";

const EMPTY: Partial<TimelineItem> = {
  date: "", endDate: "", title: "", organization: "", description: "",
  type: "milestone", order: 99,
};

export function TimelineAdmin() {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [editing, setEditing] = useState<Partial<TimelineItem> | null>(null);
  const [query, setQuery] = usePersistentState("ctl:tl:q", "");
  const [type, setType] = usePersistentState("ctl:tl:type", "ALL");
  const [view, setView] = usePersistentState<"timeline" | "table">("ctl:timeline:view", "timeline");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<TimelineItem | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { push } = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.admin.timeline();
      setItems(r.items);
      setSelected(new Set());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing({ ...EMPTY });
      setDirty(false);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((t) => (type === "ALL" ? true : t.type === type))
      .filter((t) => (!q ? true : `${t.title} ${t.organization ?? ""}`.toLowerCase().includes(q)))
      .sort((a, b) => {
        const rank = (value: string) => {
          const normalized = /^\d{4}$/.test(value) ? `${value}-01-01` : /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
          const parsed = Date.parse(normalized);
          return Number.isNaN(parsed) ? 0 : parsed;
        };
        return rank(b.date) - rank(a.date) || (a.order ?? 0) - (b.order ?? 0);
      });
  }, [items, query, type]);

  const setEdit = (patch: Partial<TimelineItem>) => {
    setEditing((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
  };

  const save = async () => {
    if (!editing?.title?.trim() || !editing?.date?.trim()) {
      push({ kind: "error", title: "Title and date required" });
      return;
    }
    setBusy(true);
    try {
      const payload = { ...editing, endDate: editing.endDate || null, organization: editing.organization || null };
      if (editing.id) await api.admin.updateTimeline(editing.id, payload);
      else await api.admin.createTimeline(payload);
      push({ kind: "success", title: editing.id ? "Entry saved" : "Entry created" });
      setEditing(null);
      setDirty(false);
      void load();
    } catch (e) {
      push({ kind: "error", title: "Save failed", desc: friendlyError(e) });
    } finally {
      setBusy(false);
    }
  };

  const bulkDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBusy(true);
    let done = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await api.admin.deleteTimeline(id);
        done += 1;
      } catch {
        failed += 1;
      }
    }
    setBusy(false);
    setConfirmBulkDelete(false);
    if (done > 0) push({ kind: "success", title: `Deleted ${done} entr${done === 1 ? "y" : "ies"}` });
    if (failed > 0) push({ kind: "error", title: `Could not delete ${failed}` });
    void load();
  };

  const closeEditor = () => {
    if (dirty) setConfirmDiscard(true);
    else setEditing(null);
  };

  const allChecked = filtered.length > 0 && filtered.every((x) => selected.has(x.id));

  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await api.admin.deleteTimeline(toDelete.id);
      push({ kind: "success", title: "Entry deleted" });
      setToDelete(null);
      void load();
    } catch (e) {
      push({ kind: "error", title: "Delete failed", desc: friendlyError(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead title="Timeline" desc={`${filtered.length} of ${items.length} entr${items.length === 1 ? "y" : "ies"} · shown chronologically publicly.`}
        actions={<><SearchInput value={query} onChange={setQuery} label="Search timeline" placeholder="Search entries…" /><div className="ctl-view-toggle" role="group" aria-label="Timeline layout"><button className={view === "timeline" ? "active" : ""} aria-pressed={view === "timeline"} onClick={() => setView("timeline")}><AdminIcon name="timeline" size={15} /><span>Timeline</span></button><button className={view === "table" ? "active" : ""} aria-pressed={view === "table"} onClick={() => setView("table")}><AdminIcon name="audit" size={15} /><span>Table</span></button></div><button className="ctl-btn ctl-btn--primary" onClick={() => { setEditing({ ...EMPTY }); setDirty(false); }}>New entry</button></>} />
      <div className="ctl-toolbar">
        <select className="ctl-select ctl-select--auto" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
          {["ALL", "education", "project", "certification", "experience", "competition", "milestone"].map((t) => (<option key={t} value={t}>{t === "ALL" ? "All types" : t}</option>))}
        </select>
        {(query || type !== "ALL") && <button className="ctl-mini-btn" onClick={() => { setQuery(""); setType("ALL"); }}>Clear filters</button>}
        {selected.size > 0 && (
          <div className="ctl-bulkbar" role="toolbar" aria-label="Bulk actions">
            <span>{selected.size} selected</span>
            <button className="ctl-mini-btn danger" onClick={() => setConfirmBulkDelete(true)}>Delete…</button>
            <button className="ctl-mini-btn" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}
      </div>
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {loading && items.length === 0 ? <SkeletonList rows={5} />
        : filtered.length === 0 ? <EmptyState
            title={query ? `No results for “${query}”` : "No entries"}
            desc={query ? "Try a different search, or clear filters." : "Add milestones, education, or experience."}
            action={query
              ? <button className="ctl-btn ctl-btn--secondary ctl-btn--sm" onClick={() => { setQuery(""); setType("ALL"); }}>Clear search</button>
              : <button className="ctl-btn ctl-btn--primary" onClick={() => { setEditing({ ...EMPTY }); setDirty(false); }}>+ New entry</button>}
          />
        : (
          view === "timeline" ? <div className="ctl-timeline">
            {filtered.map((item) => <article className="ctl-timeline-item" key={item.id}>
              <div className="ctl-timeline-top"><div><Badge tone="neutral">{item.type}</Badge>{item.organization && <span className="ctl-timeline-org">{item.organization}</span>}</div><time className="ctl-timeline-date">{item.date}{item.endDate ? ` – ${item.endDate}` : ""}</time></div>
              <h2>{item.title}</h2>{item.description && <p>{item.description}</p>}
              <div className="ctl-row-actions"><button className="ctl-mini-btn" onClick={() => { setEditing({ ...item }); setDirty(false); }}>Edit</button><button className="ctl-mini-btn danger" onClick={() => setToDelete(item)}>Delete</button></div>
            </article>)}
          </div> : <div className="ctl-table-wrap">
            <table className="ctl-table">
              <thead><tr><th><input type="checkbox" checked={allChecked} onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((x) => x.id)) : new Set())} aria-label="Select all entries" /></th><th>Title</th><th>Type</th><th>Date</th><th>Order</th><th><span className="ctl-th-static">Actions</span></th></tr></thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className={selected.has(t.id) ? "selected" : ""}>
                    <td data-mobile-label="Select"><input type="checkbox" checked={selected.has(t.id)} onChange={(e) => setSelected((prev) => { const n = new Set(prev); if (e.target.checked) n.add(t.id); else n.delete(t.id); return n; })} aria-label={`Select ${t.title}`} /></td>
                    <td data-mobile-primary="Title" data-mobile-label="Title"><button className="ctl-link-btn" onClick={() => { setEditing({ ...t }); setDirty(false); }}>{t.title}</button><div className="ctl-row-sub">{t.organization ?? ""}</div></td>
                    <td data-mobile-label="Type"><Badge tone="neutral">{t.type}</Badge></td>
                    <td data-mobile-label="Date">{t.date}{t.endDate ? ` – ${t.endDate}` : ""}</td>
                    <td data-mobile-label="Order">{t.order}</td>
                    <td data-mobile-label="Actions"><div className="ctl-row-actions"><button className="ctl-mini-btn" onClick={() => { setEditing({ ...t }); setDirty(false); }}>Edit</button><button className="ctl-mini-btn danger" onClick={() => setToDelete(t)}>Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      <Dialog open={!!editing} onClose={closeEditor} title={`${editing?.id ? "Edit entry" : "New entry"}${dirty ? " · unsaved" : ""}`}
        actions={<><button className="ctl-btn ctl-btn--ghost" onClick={closeEditor}>Cancel</button><button className="ctl-btn ctl-btn--primary" onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : "Save"}</button></>}>
        {editing && (
          <div className="ctl-form-grid">
            <div className="ctl-field full"><label htmlFor="tl-title">Title</label><input id="tl-title" className="ctl-input" value={editing.title ?? ""} onChange={(e) => setEdit({ title: e.target.value })} /></div>
            <div className="ctl-field"><label htmlFor="tl-start">Start date</label><input id="tl-start" className="ctl-input" value={editing.date ?? ""} onChange={(e) => setEdit({ date: e.target.value })} placeholder="2024 or 2024-06" /></div>
            <div className="ctl-field"><label htmlFor="tl-end">End date (optional)</label><input id="tl-end" className="ctl-input" value={editing.endDate ?? ""} onChange={(e) => setEdit({ endDate: e.target.value })} /></div>
            <div className="ctl-field"><label htmlFor="tl-org">Organization</label><input id="tl-org" className="ctl-input" value={editing.organization ?? ""} onChange={(e) => setEdit({ organization: e.target.value })} /></div>
            <div className="ctl-field"><label htmlFor="tl-type">Type</label>
              <select id="tl-type" className="ctl-select" value={editing.type ?? "milestone"} onChange={(e) => setEdit({ type: e.target.value as TimelineItem["type"] })}>
                {["education", "project", "certification", "experience", "competition", "milestone"].map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
            <div className="ctl-field"><label htmlFor="tl-order">Order (lower shows first)</label><input id="tl-order" className="ctl-input" type="number" value={String(editing.order ?? 99)} onChange={(e) => setEdit({ order: Number(e.target.value) })} /></div>
            <div className="ctl-field full"><label htmlFor="tl-desc">Description</label><textarea id="tl-desc" className="ctl-textarea" rows={3} value={editing.description ?? ""} onChange={(e) => setEdit({ description: e.target.value })} /></div>
          </div>
        )}
      </Dialog>
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => void remove()} title={`Delete "${toDelete?.title}"?`} description="This removes the entry from the public journey." confirmLabel="Delete" busy={busy} />
      <ConfirmDialog open={confirmBulkDelete} onClose={() => setConfirmBulkDelete(false)} onConfirm={() => void bulkDelete()} title={`Delete ${selected.size} entries?`} description="Every selected entry is permanently removed." confirmLabel={`Delete ${selected.size}`} busy={busy} />
      <ConfirmDialog open={confirmDiscard} onClose={() => setConfirmDiscard(false)} onConfirm={() => { setConfirmDiscard(false); setEditing(null); setDirty(false); }} title="Unsaved changes" description="Your changes have not been saved." confirmLabel="Discard" busy={false} />
    </>
  );
}
