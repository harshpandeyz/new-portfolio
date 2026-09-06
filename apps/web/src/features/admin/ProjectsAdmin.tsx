import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { api } from "../../lib/api";
import type { Project } from "@hp/shared";
import { Badge, ConfirmDialog, Dialog, EmptyState, ErrorState, PageHead, friendlyError, usePersistentState, useToast } from "./ui";

const EMPTY: Partial<Project> = {
  title: "", slug: "", codename: "", shortDescription: "", longDescription: "",
  category: "AI / Computer Vision", tier: "featured", status: "draft", featured: false,
  year: String(new Date().getFullYear()), order: 99, stack: [], githubUrl: "", liveUrl: "",
  problem: "", solution: "", architecture: "", decisions: [], challenges: "", results: "",
  securityNotes: "", dataFlow: [], gallery: [],
};

type SortKey = "order" | "title" | "updated";

export function ProjectsAdmin() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Partial<Project> | null>(null);
  const [query, setQuery] = usePersistentState("ctl:proj:q", "");
  const [tier, setTier] = usePersistentState("ctl:proj:tier", "ALL");
  const [status, setStatus] = usePersistentState("ctl:proj:status", "ALL");
  const [sort, setSort] = usePersistentState<SortKey>("ctl:proj:sort", "order");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<Project | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { push } = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.admin.projects();
      setProjects(r.projects);
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

  // Palette / quick-action entry: ?new=1 opens a blank editor once.
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing({ ...EMPTY });
      setDirty(false);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = projects.filter((p) => {
      if (tier !== "ALL" && p.tier !== tier) return false;
      if (status !== "ALL" && p.status !== status) return false;
      if (q && !`${p.title} ${p.slug} ${p.category}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "updated") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }, [projects, query, tier, status, sort]);

  const toggleSort = (key: Extract<SortKey, "title" | "updated">) => {
    // Header click: first click sorts by that column, second returns to manual order.
    setSort((s) => (s === key ? "order" : key));
  };

  const setEdit = (patch: Partial<Project>) => {
    setEditing((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.title?.trim() || !editing.slug?.trim() || !editing.shortDescription?.trim()) {
      push({ kind: "error", title: "Missing fields", desc: "Title, slug, and short description are required." });
      return;
    }
    setBusy(true);
    try {
      if (editing.id) await api.admin.updateProject(editing.id, editing);
      else await api.admin.createProject(editing);
      push({ kind: "success", title: editing.id ? "Project saved" : "Project created" });
      setEditing(null);
      setDirty(false);
      void load();
    } catch (e) {
      push({ kind: "error", title: "Save failed", desc: friendlyError(e) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await api.admin.deleteProject(toDelete.id);
      push({ kind: "success", title: "Project deleted" });
      setToDelete(null);
      void load();
    } catch (e) {
      push({ kind: "error", title: "Delete failed", desc: friendlyError(e) });
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
        await api.admin.deleteProject(id);
        done += 1;
      } catch {
        failed += 1;
      }
    }
    setBusy(false);
    setConfirmBulkDelete(false);
    if (done > 0) push({ kind: "success", title: `Deleted ${done} project${done === 1 ? "" : "s"}` });
    if (failed > 0) push({ kind: "error", title: `Could not delete ${failed}`, desc: "Some projects may require admin role." });
    void load();
  };

  const closeEditor = () => {
    if (dirty) setConfirmDiscard(true);
    else setEditing(null);
  };

  const clearFilters = () => {
    setQuery("");
    setTier("ALL");
    setStatus("ALL");
  };

  const allChecked = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  return (
    <>
      <PageHead
        title="Projects"
        desc={`${filtered.length} of ${projects.length} project${projects.length === 1 ? "" : "s"} · drafts stay hidden from the public site.`}
        actions={
          <>
            <input className="ctl-input ctl-search" placeholder="Search title, slug, category…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search projects" />
            <button className="ctl-btn ctl-btn--primary" onClick={() => { setEditing({ ...EMPTY }); setDirty(false); }}>+ New project</button>
          </>
        }
      />
      <div className="ctl-toolbar">
        <select className="ctl-select" value={tier} onChange={(e) => setTier(e.target.value)} style={{ width: "auto" }} aria-label="Filter by tier">
          {["ALL", "featured", "secondary", "experiment", "academic", "legacy", "internship"].map((t) => (<option key={t} value={t}>{t === "ALL" ? "All tiers" : t}</option>))}
        </select>
        <select className="ctl-select" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "auto" }} aria-label="Filter by status">
          {["ALL", "draft", "active", "complete", "maintained", "archived"].map((s) => (<option key={s} value={s}>{s === "ALL" ? "All statuses" : s}</option>))}
        </select>
        <select className="ctl-select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} style={{ width: "auto" }} aria-label="Sort projects">
          <option value="order">Sort: Order</option>
          <option value="title">Sort: Title</option>
          <option value="updated">Sort: Recently updated</option>
        </select>
        {(query || tier !== "ALL" || status !== "ALL") && (
          <button className="ctl-mini-btn" onClick={clearFilters}>Clear filters</button>
        )}
        {selected.size > 0 && (
          <div className="ctl-bulkbar" role="toolbar" aria-label="Bulk actions">
            <span>{selected.size} selected</span>
            <button className="ctl-mini-btn danger" onClick={() => setConfirmBulkDelete(true)}>Delete…</button>
            <button className="ctl-mini-btn" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {loading ? (
        <div className="ctl-card"><p style={{ color: "#8a93a3" }}>Loading projects…</p></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={query ? `No results for “${query}”` : "No projects found"}
          desc={query ? "Try a different search, or clear filters." : "Create your first project to populate the portfolio."}
          action={query ? <button className="ctl-btn ctl-btn--secondary ctl-btn--sm" onClick={clearFilters}>Clear search</button>
            : <button className="ctl-btn ctl-btn--primary" onClick={() => { setEditing({ ...EMPTY }); setDirty(false); }}>+ New project</button>}
        />
      ) : (
        <div className="ctl-table-wrap">
          <table className="ctl-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={allChecked} onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((p) => p.id)) : new Set())} aria-label="Select all projects" /></th>
                <th><button className="ctl-th-sort" onClick={() => toggleSort("title")} aria-label="Sort by title">Title {sort === "title" ? "↓" : ""}</button></th>
                <th>Tier</th><th>Status</th><th>Order</th>
                <th><button className="ctl-th-sort" onClick={() => toggleSort("updated")} aria-label="Sort by update time">Updated {sort === "updated" ? "↓" : ""}</button></th>
                <th><span className="ctl-th-static">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className={selected.has(p.id) ? "selected" : ""}>
                  <td><input type="checkbox" checked={selected.has(p.id)} onChange={(e) => setSelected((prev) => { const n = new Set(prev); if (e.target.checked) n.add(p.id); else n.delete(p.id); return n; })} aria-label={`Select ${p.title}`} /></td>
                  <td>
                    <button className="ctl-link-btn" onClick={() => { setEditing({ ...p }); setDirty(false); }}>{p.title}</button>
                    {p.featured && <span> </span>}
                    {p.featured && <Badge tone="amber">FEATURED</Badge>}
                    <div className="ctl-row-sub">{p.slug}</div>
                  </td>
                  <td><Badge tone="neutral">{p.tier}</Badge></td>
                  <td><Badge tone={p.status === "draft" ? "gray" : p.status === "archived" ? "red" : "green"}>{p.status}</Badge></td>
                  <td>{p.order}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{new Date(p.updatedAt).toLocaleDateString()}</td>
                  <td>
                    <div className="ctl-row-actions">
                      <button className="ctl-mini-btn" onClick={() => { setEditing({ ...p }); setDirty(false); }}>Edit</button>
                      <a className="ctl-mini-btn" href={`/projects/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>View</a>
                      <button className="ctl-mini-btn danger" onClick={() => setToDelete(p)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={!!editing}
        onClose={closeEditor}
        title={`${editing?.id ? "Edit project" : "New project"}${dirty ? " · unsaved" : ""}`}
        description="Changes go live on the public site immediately (except drafts)."
        wide
        actions={
          <>
            <button className="ctl-btn ctl-btn--ghost" onClick={closeEditor}>Cancel</button>
            <button className="ctl-btn ctl-btn--primary" onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : editing?.id ? "Save changes" : "Create project"}</button>
          </>
        }
      >
        {editing && (
          <div>
            <div className="ctl-editor-section">
              <h3>Basic info</h3>
              <div className="ctl-form-grid">
                <div className="ctl-field"><label htmlFor="pj-title">Title</label><input id="pj-title" className="ctl-input" value={editing.title ?? ""} onChange={(e) => setEdit({ title: e.target.value })} autoComplete="off" /></div>
                <div className="ctl-field"><label htmlFor="pj-slug">Slug (kebab-case, public URL)</label><input id="pj-slug" className="ctl-input" value={editing.slug ?? ""} onChange={(e) => setEdit({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") })} autoComplete="off" /></div>
                <div className="ctl-field"><label htmlFor="pj-cat">Category</label><input id="pj-cat" className="ctl-input" value={editing.category ?? ""} onChange={(e) => setEdit({ category: e.target.value })} /></div>
                <div className="ctl-field"><label htmlFor="pj-year">Year</label><input id="pj-year" className="ctl-input" value={editing.year ?? ""} onChange={(e) => setEdit({ year: e.target.value })} /></div>
              </div>
            </div>
            <div className="ctl-editor-section">
              <h3>Description</h3>
              <div className="ctl-form-grid">
                <div className="ctl-field full"><label htmlFor="pj-short">Short description (shown on cards)</label><textarea id="pj-short" className="ctl-textarea" rows={2} value={editing.shortDescription ?? ""} onChange={(e) => setEdit({ shortDescription: e.target.value })} /></div>
                <div className="ctl-field full"><label htmlFor="pj-long">Long description</label><textarea id="pj-long" className="ctl-textarea" rows={4} value={editing.longDescription ?? ""} onChange={(e) => setEdit({ longDescription: e.target.value })} /></div>
              </div>
            </div>
            <div className="ctl-editor-section">
              <h3>Technical details</h3>
              <div className="ctl-form-grid">
                <div className="ctl-field full"><label htmlFor="pj-stack">Tech stack (comma-separated)</label><input id="pj-stack" className="ctl-input" value={(editing.stack ?? []).join(", ")} onChange={(e) => setEdit({ stack: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} /></div>
              </div>
            </div>
            <div className="ctl-editor-section">
              <h3>Links & media</h3>
              <div className="ctl-form-grid">
                <div className="ctl-field"><label htmlFor="pj-gh">GitHub URL</label><input id="pj-gh" className="ctl-input" type="url" inputMode="url" value={editing.githubUrl ?? ""} onChange={(e) => setEdit({ githubUrl: e.target.value })} /></div>
                <div className="ctl-field"><label htmlFor="pj-live">Live URL</label><input id="pj-live" className="ctl-input" type="url" inputMode="url" value={editing.liveUrl ?? ""} onChange={(e) => setEdit({ liveUrl: e.target.value })} /></div>
                <div className="ctl-field full"><label htmlFor="pj-hero">Hero image URL</label><input id="pj-hero" className="ctl-input" value={(editing.heroImage as string | null) ?? ""} onChange={(e) => setEdit({ heroImage: e.target.value })} placeholder="/static/media/… (upload in Media first)" /></div>
              </div>
            </div>
            <div className="ctl-editor-section">
              <h3>Publishing</h3>
              <div className="ctl-form-grid">
                <div className="ctl-field"><label htmlFor="pj-tier">Tier</label>
                  <select id="pj-tier" className="ctl-select" value={editing.tier ?? "featured"} onChange={(e) => setEdit({ tier: e.target.value as Project["tier"] })}>
                    {["featured", "secondary", "experiment", "academic", "legacy", "internship"].map((t) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </div>
                <div className="ctl-field"><label htmlFor="pj-status">Status (draft hides it publicly)</label>
                  <select id="pj-status" className="ctl-select" value={editing.status ?? "draft"} onChange={(e) => setEdit({ status: e.target.value as Project["status"] })}>
                    {["draft", "active", "complete", "maintained", "archived"].map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
                <div className="ctl-field"><label htmlFor="pj-order">Order (lower shows first)</label><input id="pj-order" className="ctl-input" type="number" value={String(editing.order ?? 99)} onChange={(e) => setEdit({ order: Number(e.target.value) })} /></div>
                <div className="ctl-field"><label>Flags</label><label style={{ fontSize: 13 }}><input type="checkbox" checked={!!editing.featured} onChange={(e) => setEdit({ featured: e.target.checked })} /> Featured</label></div>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => void remove()} title={`Delete "${toDelete?.title}"?`} description="This permanently removes the project from the public site." confirmLabel="Delete project" busy={busy} />
      <ConfirmDialog
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={() => void bulkDelete()}
        title={`Delete ${selected.size} projects?`}
        description="Every selected project is permanently removed from the public site."
        confirmLabel={`Delete ${selected.size}`}
        busy={busy}
      />
      <ConfirmDialog open={confirmDiscard} onClose={() => setConfirmDiscard(false)} onConfirm={() => { setConfirmDiscard(false); setEditing(null); setDirty(false); }} title="Unsaved changes" description="Your changes have not been saved." confirmLabel="Discard" busy={false} />
    </>
  );
}
