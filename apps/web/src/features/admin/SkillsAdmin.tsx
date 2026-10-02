import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { api } from "../../lib/api";
import type { Project, Skill } from "@hp/shared";
import { AdminIcon } from "./Icon";
import { Badge, ConfirmDialog, Dialog, EmptyState, ErrorState, PageHead, SearchInput, SkeletonList, friendlyError, usePersistentState, useToast } from "./ui";

const EMPTY: Partial<Skill> = {
  name: "", category: "LANGUAGES", level: "working", description: "",
  usedInProjectSlugs: [], relatedConcepts: [], featured: false, recruiterPriority: 0, order: 99,
};

export function SkillsAdmin() {
  const [items, setItems] = useState<Skill[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Partial<Skill> | null>(null);
  const [query, setQuery] = usePersistentState("ctl:skill:q", "");
  const [category, setCategory] = usePersistentState("ctl:skill:cat", "ALL");
  const [level, setLevel] = usePersistentState("ctl:skill:lvl", "ALL");
  const [view, setView] = usePersistentState<"groups" | "table">("ctl:skill:view", "groups");
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
      void api.admin.projects().then((result) => setProjects(result.projects)).catch(() => undefined);
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
  const projectBySlug = useMemo(() => new Map(projects.map((project) => [project.slug, project])), [projects]);
  const groups = useMemo(() => [...new Set(filtered.map((skill) => skill.category))], [filtered]);
  const categoryLabel = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  const levelRank: Record<string, number> = { experimental: 1, exploring: 2, working: 3, core: 4 };

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
      <PageHead title="Skills" desc={`${filtered.length} of ${items.length} capabilities · levels are shown exactly as stored.`}
        actions={<><SearchInput value={query} onChange={setQuery} label="Search skills" placeholder="Search skills…" /><button className="ctl-btn ctl-btn--primary" onClick={() => { setEditing({ ...EMPTY }); setDirty(false); }}>+ New skill</button></>} />
      <div className="ctl-toolbar">
        <select className="ctl-select ctl-filter-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          {["ALL", "LANGUAGES", "FRONTEND", "BACKEND", "DATABASES", "AI_ML", "CLOUD_DEVOPS", "SECURITY", "MOBILE", "BLOCKCHAIN", "EXPERIMENTAL"].map((c) => (<option key={c} value={c}>{c === "ALL" ? "All categories" : c}</option>))}
        </select>
        <select className="ctl-select ctl-filter-select" value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Filter by level">
          {["ALL", "core", "working", "exploring", "experimental"].map((l) => (<option key={l} value={l}>{l === "ALL" ? "All levels" : l}</option>))}
        </select>
        <label className="ctl-selectpage"><input type="checkbox" checked={allChecked} onChange={(event) => setSelected(event.target.checked ? new Set(filtered.map((skill) => skill.id)) : new Set())} aria-label="Select all visible skills" />Select visible</label>
        <div className="ctl-view-toggle" role="group" aria-label="Skills layout">
          <button type="button" aria-pressed={view === "groups"} onClick={() => setView("groups")}><AdminIcon name="skills" size={15} />Groups</button>
          <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}><AdminIcon name="projects" size={15} />Table</button>
        </div>
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
        : view === "groups" ? (
          <div className="ctl-skill-groups">
            {groups.map((group) => {
              const skills = filtered.filter((skill) => skill.category === group);
              return <section className="ctl-skill-group" key={group}>
                <div className="ctl-skill-group-head"><h2>{categoryLabel(group)}</h2><span>{skills.length} skill{skills.length === 1 ? "" : "s"}</span></div>
                <div className="ctl-skill-card-grid">
                  {skills.map((skill) => {
                    const rank = levelRank[skill.level] ?? 1;
                    return <article className="ctl-skill-card" data-level={skill.level} key={skill.id}>
                      <div className="ctl-skill-card-head">
                        <label className="ctl-skill-select"><input type="checkbox" checked={selected.has(skill.id)} onChange={(event) => setSelected((prev) => { const next = new Set(prev); if (event.target.checked) next.add(skill.id); else next.delete(skill.id); return next; })} aria-label={`Select ${skill.name}`} /></label>
                        <button type="button" className="ctl-link-btn" onClick={() => { setEditing({ ...skill }); setDirty(false); }}>{skill.name}</button>
                        {skill.featured && <Badge tone="blue">Featured</Badge>}
                      </div>
                      <div className="ctl-skill-proficiency">
                        <span className="ctl-proficiency-meter" role="img" aria-label={`Level recorded: ${skill.level}`}>
                          {Array.from({ length: 4 }, (_, index) => <i key={index} className={index < rank ? "active" : ""} />)}
                        </span>
                        <span>Level recorded: <b>{categoryLabel(skill.level)}</b></span>
                      </div>
                      {skill.description && <p className="ctl-skill-description">{skill.description}</p>}
                      <div className="ctl-skill-evidence">
                        <strong>Project evidence</strong>
                        {skill.usedInProjectSlugs.length ? <ul>{skill.usedInProjectSlugs.map((slug) => {
                          const project = projectBySlug.get(slug);
                          return <li key={`${skill.id}:${slug}`}>{project ? <a href={`/projects/${project.slug}`} target="_blank" rel="noopener noreferrer">{project.title}</a> : <span className="is-orphan">Unknown project: {slug}</span>}</li>;
                        })}</ul> : <span className="ctl-hint">No project evidence recorded.</span>}
                      </div>
                      {skill.relatedConcepts.length > 0 && <div className="ctl-tech-list">{skill.relatedConcepts.slice(0, 4).map((concept) => <span key={concept}>{concept}</span>)}{skill.relatedConcepts.length > 4 && <span>+{skill.relatedConcepts.length - 4}</span>}</div>}
                      <div className="ctl-skill-card-foot"><span>{skill.order} · public order</span><button type="button" className="ctl-btn ctl-btn--ghost ctl-btn--sm" onClick={() => { setEditing({ ...skill }); setDirty(false); }}>Edit skill</button></div>
                    </article>;
                  })}
                </div>
              </section>;
            })}
            <p className="ctl-data-note">Project evidence uses the text labels stored on each skill. The current schema does not link certificates to skills.</p>
          </div>
        ) : (
          <div className="ctl-table-wrap">
            <table className="ctl-table">
              <thead><tr><th><input type="checkbox" checked={allChecked} onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((s) => s.id)) : new Set())} aria-label="Select all skills" /></th><th>Name</th><th>Category</th><th>Level</th><th>Order</th><th><span className="ctl-th-static">Actions</span></th></tr></thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className={selected.has(s.id) ? "selected" : ""}>
                    <td><input type="checkbox" checked={selected.has(s.id)} onChange={(e) => setSelected((prev) => { const n = new Set(prev); if (e.target.checked) n.add(s.id); else n.delete(s.id); return n; })} aria-label={`Select ${s.name}`} /></td>
                    <td data-mobile-primary><button className="ctl-link-btn" onClick={() => { setEditing({ ...s }); setDirty(false); }}>{s.name}</button> {s.featured && <Badge tone="blue">Featured</Badge>}</td>
                    <td data-mobile-label="Category"><Badge tone="neutral">{categoryLabel(s.category)}</Badge></td>
                    <td data-mobile-label="Level">{categoryLabel(s.level)}</td>
                    <td data-mobile-label="Order">{s.order}</td>
                    <td data-mobile-label="Actions"><div className="ctl-row-actions"><button className="ctl-mini-btn" onClick={() => { setEditing({ ...s }); setDirty(false); }}>Edit</button><button className="ctl-mini-btn danger" onClick={() => setToDelete(s)}>Delete</button></div></td>
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
            <div className="ctl-field"><label htmlFor="sk-recruiter-priority">Recruiter priority (0 hides)</label><input id="sk-recruiter-priority" className="ctl-input" type="number" min="0" max="999" value={String(editing.recruiterPriority ?? 0)} onChange={(e) => setEdit({ recruiterPriority: Number(e.target.value) })} /></div>
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
            <fieldset className="ctl-field full"><legend>Project evidence</legend><span className="ctl-field-hint">Choose projects linked to this skill. Links use stable project slugs.</span><div className="ctl-form-grid">{projects.map((project) => <label className="ctl-featured-check" key={project.slug}><input type="checkbox" checked={(editing.usedInProjectSlugs ?? []).includes(project.slug)} onChange={(e) => { const refs = editing.usedInProjectSlugs ?? []; setEdit({ usedInProjectSlugs: e.target.checked ? [...refs, project.slug] : refs.filter((slug) => slug !== project.slug) }); }} />{project.title}{project.status === "draft" ? " · Draft" : ""}</label>)}</div></fieldset>
            <div className="ctl-field full"><label htmlFor="sk-concepts">Related concepts</label><input id="sk-concepts" className="ctl-input" value={(editing.relatedConcepts ?? []).join(", ")} onChange={(e) => setEdit({ relatedConcepts: e.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} placeholder="e.g. Retrieval augmented generation, vector search" /></div>
            <div className="ctl-field"><label>Flags</label><label className="ctl-featured-check"><input type="checkbox" checked={!!editing.featured} onChange={(e) => setEdit({ featured: e.target.checked })} /> Featured</label></div>
          </div>
        )}
      </Dialog>
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => void remove()} title={`Delete "${toDelete?.name}"?`} description="This removes the skill from the public stack." confirmLabel="Delete" busy={busy} />
      <ConfirmDialog open={confirmBulkDelete} onClose={() => setConfirmBulkDelete(false)} onConfirm={() => void bulkDelete()} title={`Delete ${selected.size} skills?`} description="Every selected skill is permanently removed." confirmLabel={`Delete ${selected.size}`} busy={busy} />
      <ConfirmDialog open={confirmDiscard} onClose={() => setConfirmDiscard(false)} onConfirm={() => { setConfirmDiscard(false); setEditing(null); setDirty(false); }} title="Unsaved changes" description="Your changes have not been saved." confirmLabel="Discard" busy={false} />
    </>
  );
}
