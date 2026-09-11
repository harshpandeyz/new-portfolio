import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { api } from "../../lib/api";
import type { Skill } from "@hp/shared";
import { Badge, ConfirmDialog, Dialog, EmptyState, ErrorState, PageHead, SearchInput, SkeletonList, friendlyError, usePersistentState, useToast } from "./ui";

const EMPTY: Partial<Skill> = {
  name: "", category: "LANGUAGES", level: "working", description: "",
  usedIn: [], relatedConcepts: [], featured: false, order: 99,
};

export function SkillsAdmin() {
  const [items, setItems] = useState<Skill[]>([]);
  const [editing, setEditing] = useState<Partial<Skill> | null>(null);
  const [query, setQuery] = usePersistentState("ctl:skill:q", "");
  const [category, setCategory] = usePersistentState("ctl:skill:cat", "ALL");
  const [level, setLevel] = usePersistentState("ctl:skill:lvl", "ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<Skill | null>(null);
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
      const r = await api.admin.skills();
      setItems(r.skills);
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
      .filter((s) => (category === "ALL" ? true : s.category === category))
      .filter((s) => (level === "ALL" ? true : s.level === level))
      .filter((s) => (!q ? true : `${s.name} ${s.description ?? ""}`.toLowerCase().includes(q)))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [items, query, category, level]);

  const setEdit = (patch: Partial<Skill>) => {
    setEditing((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
  };

  const save = async () => {
    if (!editing?.name?.trim()) {
      push({ kind: "error", title: "Name required" });
      return;
    }
    setBusy(true);
    try {
      if (editing.id) await api.admin.updateSkill(editing.id, editing);
      else await api.admin.createSkill(editing);
      push({ kind: "success", title: editing.id ? "Skill saved" : "Skill created" });
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
        await api.admin.deleteSkill(id);
        done += 1;
      } catch {
        failed += 1;
      }
    }
    setBusy(false);
    setConfirmBulkDelete(false);
    if (done > 0) push({ kind: "success", title: `Deleted ${done} skill${done === 1 ? "" : "s"}` });
    if (failed > 0) push({ kind: "error", title: `Could not delete ${failed}` });
    void load();
  };

  const closeEditor = () => {
    if (dirty) setConfirmDiscard(true);
    else setEditing(null);
  };

  const allChecked = filtered.length > 0 && filtered.every((s) => selected.has(s.id));

  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await api.admin.deleteSkill(toDelete.id);
      push({ kind: "success", title: "Skill deleted" });
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
      <PageHead title="Skills" desc={`${filtered.length} of ${items.length} skill${items.length === 1 ? "" : "s"}.`}
        actions={<><SearchInput value={query} onChange={setQuery} label="Search skills" placeholder="Search skills…" /><button className="ctl-btn ctl-btn--primary" onClick={() => { setEditing({ ...EMPTY }); setDirty(false); }}>+ New skill</button></>} />
      <div className="ctl-toolbar">
        <select className="ctl-select" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "auto" }} aria-label="Filter by category">
          {["ALL", "LANGUAGES", "FRONTEND", "BACKEND", "DATABASES", "AI_ML", "CLOUD_DEVOPS", "SECURITY", "MOBILE", "BLOCKCHAIN", "EXPERIMENTAL"].map((c) => (<option key={c} value={c}>{c === "ALL" ? "All categories" : c}</option>))}
        </select>
        <select className="ctl-select" value={level} onChange={(e) => setLevel(e.target.value)} style={{ width: "auto" }} aria-label="Filter by level">
          {["ALL", "core", "working", "exploring", "experimental"].map((l) => (<option key={l} value={l}>{l === "ALL" ? "All levels" : l}</option>))}
        </select>
        {(query || category !== "ALL" || level !== "ALL") && <button className="ctl-mini-btn" onClick={() => { setQuery(""); setCategory("ALL"); setLevel("ALL"); }}>Clear filters</button>}
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
            title={query ? `No results for “${query}”` : "No skills"}
            desc={query ? "Try a different search, or clear filters." : "Add your first skill to populate the stack section."}
            action={query
              ? <button className="ctl-btn ctl-btn--secondary ctl-btn--sm" onClick={() => { setQuery(""); setCategory("ALL"); setLevel("ALL"); }}>Clear search</button>
              : <button className="ctl-btn ctl-btn--primary" onClick={() => { setEditing({ ...EMPTY }); setDirty(false); }}>+ New skill</button>}
          />
        : (
          <div className="ctl-table-wrap">
            <table className="ctl-table">
              <thead><tr><th><input type="checkbox" checked={allChecked} onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((s) => s.id)) : new Set())} aria-label="Select all skills" /></th><th>Name</th><th>Category</th><th>Level</th><th>Order</th><th><span className="ctl-th-static">Actions</span></th></tr></thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className={selected.has(s.id) ? "selected" : ""}>
                    <td><input type="checkbox" checked={selected.has(s.id)} onChange={(e) => setSelected((prev) => { const n = new Set(prev); if (e.target.checked) n.add(s.id); else n.delete(s.id); return n; })} aria-label={`Select ${s.name}`} /></td>
                    <td><button className="ctl-link-btn" onClick={() => { setEditing({ ...s }); setDirty(false); }}>{s.name}</button> {s.featured && <Badge tone="amber">FEATURED</Badge>}</td>
                    <td><Badge tone="neutral">{s.category}</Badge></td>
                    <td><Badge tone={s.level === "core" ? "blue" : s.level === "working" ? "green" : "gray"}>{s.level}</Badge></td>
                    <td>{s.order}</td>
                    <td><div className="ctl-row-actions"><button className="ctl-mini-btn" onClick={() => { setEditing({ ...s }); setDirty(false); }}>Edit</button><button className="ctl-mini-btn danger" onClick={() => setToDelete(s)}>Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      <Dialog open={!!editing} onClose={closeEditor} title={`${editing?.id ? "Edit skill" : "New skill"}${dirty ? " · unsaved" : ""}`}
        actions={<><button className="ctl-btn ctl-btn--ghost" onClick={closeEditor}>Cancel</button><button className="ctl-btn ctl-btn--primary" onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : "Save"}</button></>}>
        {editing && (
          <div className="ctl-form-grid">
            <div className="ctl-field"><label htmlFor="sk-name">Name</label><input id="sk-name" className="ctl-input" value={editing.name ?? ""} onChange={(e) => setEdit({ name: e.target.value })} /></div>
            <div className="ctl-field"><label htmlFor="sk-order">Order (lower shows first)</label><input id="sk-order" className="ctl-input" type="number" value={String(editing.order ?? 99)} onChange={(e) => setEdit({ order: Number(e.target.value) })} /></div>
            <div className="ctl-field"><label htmlFor="sk-cat">Category</label>
              <select id="sk-cat" className="ctl-select" value={editing.category ?? "LANGUAGES"} onChange={(e) => setEdit({ category: e.target.value as Skill["category"] })}>
                {["LANGUAGES", "FRONTEND", "BACKEND", "DATABASES", "AI_ML", "CLOUD_DEVOPS", "SECURITY", "MOBILE", "BLOCKCHAIN", "EXPERIMENTAL"].map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <div className="ctl-field"><label htmlFor="sk-level">Level (honest proficiency)</label>
              <select id="sk-level" className="ctl-select" value={editing.level ?? "working"} onChange={(e) => setEdit({ level: e.target.value as Skill["level"] })}>
                {["core", "working", "exploring", "experimental"].map((l) => (<option key={l} value={l}>{l}</option>))}
              </select>
            </div>
            <div className="ctl-field full"><label htmlFor="sk-desc">Description</label><textarea id="sk-desc" className="ctl-textarea" rows={2} value={editing.description ?? ""} onChange={(e) => setEdit({ description: e.target.value })} /></div>
            <div className="ctl-field"><label>Flags</label><label style={{ fontSize: 13 }}><input type="checkbox" checked={!!editing.featured} onChange={(e) => setEdit({ featured: e.target.checked })} /> Featured</label></div>
          </div>
        )}
      </Dialog>
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => void remove()} title={`Delete "${toDelete?.name}"?`} description="This removes the skill from the public stack." confirmLabel="Delete" busy={busy} />
      <ConfirmDialog open={confirmBulkDelete} onClose={() => setConfirmBulkDelete(false)} onConfirm={() => void bulkDelete()} title={`Delete ${selected.size} skills?`} description="Every selected skill is permanently removed." confirmLabel={`Delete ${selected.size}`} busy={busy} />
      <ConfirmDialog open={confirmDiscard} onClose={() => setConfirmDiscard(false)} onConfirm={() => { setConfirmDiscard(false); setEditing(null); setDirty(false); }} title="Unsaved changes" description="Your changes have not been saved." confirmLabel="Discard" busy={false} />
    </>
  );
}
