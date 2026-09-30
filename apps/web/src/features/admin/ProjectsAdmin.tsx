import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { api, resolveMediaUrl } from "../../lib/api";
import type { Project } from "@hp/shared";
import { FLAGSHIP_SLUGS, SELECTED_SLUGS, isArchiveOnlySlug } from "@hp/shared";
import { AdminIcon } from "./Icon";
import {
  Badge, ConfirmDialog, Drawer, EmptyState, ErrorState, Field, PageHead, SearchInput, SkeletonList,
  Tabs, friendlyError, usePersistentState, useToast,
} from "./ui";

const EMPTY: Partial<Project> = {
  title: "", slug: "", codename: "", shortDescription: "", longDescription: "",
  category: "AI / Computer Vision", tier: "featured", status: "draft", featured: false,
  year: String(new Date().getFullYear()), order: 99, stack: [], githubUrl: "", liveUrl: "",
  heroImage: "", gallery: [],
  problem: "", solution: "", architecture: "", decisions: [], challenges: "", results: "",
  securityNotes: "", dataFlow: [],
};

type SortKey = "order" | "title" | "updated";
type TabId = "basic" | "story" | "media" | "publish";

function slugify(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

function validate(d: Partial<Project>): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.title?.trim()) e.title = "Title is required.";
  if (!d.slug?.trim()) e.slug = "Slug is required.";
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug.trim())) e.slug = "Use kebab-case: lowercase letters, numbers, hyphens.";
  if (!d.shortDescription?.trim()) e.short = "Short description is required.";
  else if (d.shortDescription.trim().length > 400) e.short = `Keep under 400 characters (${d.shortDescription.trim().length}).`;
  if (!d.category?.trim()) e.category = "Category is required.";
  if (!d.year?.trim()) e.year = "Year is required.";
  return e;
}

export function ProjectsAdmin() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Partial<Project> | null>(null);
  const [tab, setTab] = useState<TabId>("basic");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugLocked, setSlugLocked] = useState(true);
  const [query, setQuery] = usePersistentState("ctl:proj:q", "");
  const [tier, setTier] = usePersistentState("ctl:proj:tier", "ALL");
  const [status, setStatus] = usePersistentState("ctl:proj:status", "ALL");
  const [sort, setSort] = usePersistentState<SortKey>("ctl:proj:sort", "order");
  const [view, setView] = usePersistentState<"grid" | "table">("ctl:proj:view", "grid");
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

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.admin.projects();
      if (signal?.aborted) return;
      setProjects(r.projects);
      setSelected((prev) => {
        const ids = new Set(r.projects.map((p) => p.id));
        return new Set([...prev].filter((id) => ids.has(id)));
      });
    } catch (e) {
      if (!signal?.aborted) setError(friendlyError(e));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing({ ...EMPTY });
      setTab("basic");
      setErrors({});
      setSlugLocked(true);
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

  const openEditor = (p: Partial<Project>, isNew: boolean) => {
    setEditing({ ...p });
    setTab("basic");
    setErrors({});
    setSlugLocked(!isNew);
    setDirty(false);
  };

  const setEdit = (patch: Partial<Project>) => {
    setEditing((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
  };

  const save = async () => {
    if (!editing || busy) return;
    const v = validate(editing);
    setErrors(v);
    if (Object.keys(v).length > 0) {
      setTab(v.title || v.slug || v.short || v.category || v.year ? "basic" : tab);
      push({ kind: "error", title: "Check the highlighted fields" });
      return;
    }
    setBusy(true);
    try {
      if (editing.id) {
        const updated = await api.admin.updateProject(editing.id, editing);
        setProjects((list) => list.map((p) => (p.id === editing.id ? updated.project : p)));
        push({ kind: "success", title: "Project saved" });
      } else {
        const created = await api.admin.createProject(editing);
        setProjects((list) => [created.project, ...list]);
        push({ kind: "success", title: "Project created" });
      }
      setEditing(null);
      setDirty(false);
    } catch (e) {
      push({ kind: "error", title: "Save failed", desc: friendlyError(e) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!toDelete || busy) return;
    setBusy(true);
    try {
      await api.admin.deleteProject(toDelete.id);
      setProjects((list) => list.filter((p) => p.id !== toDelete.id));
      push({ kind: "success", title: "Project deleted" });
      setToDelete(null);
    } catch (e) {
      push({ kind: "error", title: "Delete failed", desc: friendlyError(e) });
    } finally {
      setBusy(false);
    }
  };

  const bulkDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0 || busy) return;
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
    setSelected(new Set());
    if (done > 0) {
      setProjects((list) => list.filter((p) => !ids.includes(p.id)));
      push({ kind: "success", title: `Deleted ${done} project${done === 1 ? "" : "s"}` });
    }
    if (failed > 0) push({ kind: "error", title: `Could not delete ${failed}`, desc: "Some projects may require admin role." });
  };

  const clone = (p: Project) => {
    const { id, createdAt, updatedAt, ...rest } = p as Project & { createdAt?: unknown; updatedAt?: unknown };
    void createdAt;
    void updatedAt;
    openEditor({ ...rest, id: undefined, title: `${p.title} (copy)`, slug: `${p.slug}-copy`, status: "draft" }, true);
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
  const tabs: { id: TabId; label: string; error?: boolean }[] = [
    { id: "basic", label: "Basic", error: Boolean(errors.title || errors.slug || errors.short || errors.category || errors.year) },
    { id: "story", label: "Story" },
    { id: "media", label: "Media & links" },
    { id: "publish", label: "Publish" },
  ];

  const setList = (key: "stack" | "decisions" | "dataFlow" | "gallery", raw: string) => {
    const arr = raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    setEdit({ [key]: arr } as Partial<Project>);
  };

  const signatureSlugs = useMemo(() => new Set([...FLAGSHIP_SLUGS, ...SELECTED_SLUGS] as string[]), []);
  const curationSlots = useMemo(() => [...FLAGSHIP_SLUGS, ...SELECTED_SLUGS].map((slug, index) => ({
    slug,
    index,
    project: projects.find((project) => project.slug === slug),
  })), [projects]);
  const isFlagship = (slug: string) => (FLAGSHIP_SLUGS as readonly string[]).includes(slug);
  const isSelected = (slug: string) => (SELECTED_SLUGS as readonly string[]).includes(slug);

  return (
    <>
      <PageHead
        title="Projects"
        desc={`${filtered.length} of ${projects.length} projects · fixed homepage slots are curated by slug. Drafts stay private until published.`}
        actions={
          <>
            <SearchInput value={query} onChange={setQuery} label="Search projects" placeholder="Search title, slug, category…" />
            <button type="button" className="ctl-btn ctl-btn--primary" onClick={() => openEditor({ ...EMPTY }, true)}>+ New project</button>
          </>
        }
      />
      <div className="ctl-curation" aria-label="Fixed homepage project slots">
        {curationSlots.map(({ slug, index, project }) => (
          <div className="ctl-curation-slot" key={slug}>
            <strong>{index < 2 ? `Flagship ${index + 1}` : `Selected ${index - 1}`}</strong>
            <span>{project ? `${project.title}${project.codename ? ` · ${project.codename}` : ""}` : "Project not found"}</span>
            <small>{project ? (project.status === "draft" ? "Draft · hidden publicly" : slug) : slug}</small>
          </div>
        ))}
      </div>
      <div className="ctl-project-summary" aria-label="Project summary">
        <div><span>Total projects</span><strong>{projects.length}</strong></div>
        <div><span>Drafts</span><strong>{projects.filter((project) => project.status === "draft").length}</strong></div>
        <div><span>Published</span><strong>{projects.filter((project) => project.status !== "draft").length}</strong></div>
        <div><span>Live curated slots</span><strong>{curationSlots.filter((slot) => slot.project && slot.project.status !== "draft").length}/4</strong></div>
      </div>
      <div className="ctl-list-toolbar">
        <select className="ctl-select ctl-select--auto" value={tier} onChange={(e) => setTier(e.target.value)} aria-label="Filter by tier">
          {["ALL", "featured", "secondary", "experiment", "academic", "legacy", "internship"].map((t) => (<option key={t} value={t}>{t === "ALL" ? "All tiers" : t}</option>))}
        </select>
        <select className="ctl-select ctl-select--auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          {["ALL", "draft", "active", "complete", "maintained", "archived"].map((s) => (<option key={s} value={s}>{s === "ALL" ? "All statuses" : s}</option>))}
        </select>
        <select className="ctl-select ctl-select--auto" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort projects">
          <option value="order">Sort: Order</option>
          <option value="title">Sort: Title</option>
          <option value="updated">Sort: Recently updated</option>
        </select>
        {(query || tier !== "ALL" || status !== "ALL") && (
          <button type="button" className="ctl-mini-btn" onClick={clearFilters}>Clear filters</button>
        )}
        {selected.size > 0 && (
          <div className="ctl-bulkbar" role="toolbar" aria-label="Bulk actions">
            <span>{selected.size} selected</span>
            <button type="button" className="ctl-mini-btn danger" disabled={busy} onClick={() => setConfirmBulkDelete(true)}>Delete…</button>
            <button type="button" className="ctl-mini-btn" disabled={busy} onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}
        <div className="ctl-view-toggle" role="group" aria-label="Project layout">
          <button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")}><AdminIcon name="media" size={15} />Grid</button>
          <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}><AdminIcon name="projects" size={15} />Table</button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {loading && projects.length === 0 ? (
        <SkeletonList rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={query ? `No results for “${query}”` : "No projects found"}
          desc={query ? "Try a different search, or clear filters." : "Create your first project to populate the portfolio."}
          action={query ? <button type="button" className="ctl-btn ctl-btn--secondary ctl-btn--sm" onClick={clearFilters}>Clear search</button>
            : <button type="button" className="ctl-btn ctl-btn--primary" onClick={() => openEditor({ ...EMPTY }, true)}>+ New project</button>}
        />
      ) : view === "grid" ? (
        <div className="ctl-project-grid">
          {filtered.map((project) => (
            <article className="ctl-project-card" key={project.id}>
              <div className="ctl-project-thumb">
                {project.heroImage ? <img src={resolveMediaUrl(project.heroImage)} alt="" loading="lazy" /> : <AdminIcon name="projects" size={26} />}
              </div>
              <div className="ctl-project-card-body">
                <div className="ctl-project-card-head">
                  <label className="ctl-check" aria-label={`Select ${project.title}`}><input type="checkbox" checked={selected.has(project.id)} onChange={(event) => setSelected((prev) => { const next = new Set(prev); if (event.target.checked) next.add(project.id); else next.delete(project.id); return next; })} /></label>
                  {isFlagship(project.slug) ? <Badge tone="amber">Flagship</Badge> : isSelected(project.slug) ? <Badge tone="blue">Selected</Badge> : isArchiveOnlySlug(project.slug) ? <Badge tone="gray">Archive only</Badge> : <Badge tone="neutral">{project.tier}</Badge>}
                </div>
                <button type="button" className="ctl-link-btn" onClick={() => openEditor({ ...project }, false)}>{project.title}</button>
                <p>{project.shortDescription}</p>
                <div className="ctl-tech-list">{project.stack.slice(0, 4).map((technology) => <span key={technology}>{technology}</span>)}{project.stack.length > 4 && <span>+{project.stack.length - 4}</span>}</div>
                <div className="ctl-project-card-foot">
                  <Badge tone={project.status === "draft" ? "gray" : project.status === "archived" ? "red" : "green"}>{project.status}</Badge>
                  <button type="button" className="ctl-btn ctl-btn--ghost ctl-btn--sm" onClick={() => openEditor({ ...project }, false)}>Edit</button>
                  <details className="ctl-overflow-menu">
                    <summary aria-label={`More actions for ${project.title}`}><AdminIcon name="more" size={18} /></summary>
                    <div>
                      <button type="button" onClick={() => clone(project)}>Duplicate as draft</button>
                      {project.status !== "draft" && <a href={`/projects/${project.slug}`} target="_blank" rel="noopener noreferrer">View public page</a>}
                      <button type="button" className="danger" onClick={() => setToDelete(project)}>Delete project</button>
                    </div>
                  </details>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="ctl-table-wrap">
          <table className="ctl-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={allChecked} onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((p) => p.id)) : new Set())} aria-label="Select all projects" /></th>
                <th aria-sort={sort === "title" ? "ascending" : "none"}>
                  <button type="button" className="ctl-th-sort" onClick={() => setSort((s) => (s === "title" ? "order" : "title"))} aria-label="Sort by title">
                    Title {sort === "title" ? "↓" : ""}
                  </button>
                </th>
                <th>Tier</th><th>Status</th><th>Order</th>
                <th aria-sort={sort === "updated" ? "descending" : "none"}>
                  <button type="button" className="ctl-th-sort" onClick={() => setSort((s) => (s === "updated" ? "order" : "updated"))} aria-label="Sort by update time">
                    Updated {sort === "updated" ? "↓" : ""}
                  </button>
                </th>
                <th><span className="ctl-th-static">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className={selected.has(p.id) ? "selected" : ""}>
                  <td><input type="checkbox" checked={selected.has(p.id)} onChange={(e) => setSelected((prev) => { const n = new Set(prev); if (e.target.checked) n.add(p.id); else n.delete(p.id); return n; })} aria-label={`Select ${p.title}`} /></td>
                  <td data-mobile-primary>
                    {p.heroImage && <img className="ctl-project-row-thumb" src={resolveMediaUrl(p.heroImage)} alt="" loading="lazy" />}
                    <button type="button" className="ctl-link-btn" onClick={() => openEditor({ ...p }, false)}>{p.title}</button>
                    {signatureSlugs.has(p.slug) && <span> </span>}
                    {isFlagship(p.slug) && <Badge tone="amber">HOMEPAGE · FLAGSHIP</Badge>}
                    {!isFlagship(p.slug) && isSelected(p.slug) && <Badge tone="amber">HOMEPAGE · SELECTED</Badge>}
                    {!signatureSlugs.has(p.slug) && p.featured && <span> </span>}
                    {!signatureSlugs.has(p.slug) && p.featured && <Badge tone="neutral">FEATURED</Badge>}
                    {isArchiveOnlySlug(p.slug) && <span> </span>}
                    {isArchiveOnlySlug(p.slug) && <Badge tone="gray">ARCHIVE ONLY</Badge>}
                    <div className="ctl-row-sub">/{p.slug}</div>
                  </td>
                  <td data-mobile-label="Tier"><Badge tone="neutral">{p.tier}</Badge></td>
                  <td data-mobile-label="Status"><Badge tone={p.status === "draft" ? "gray" : p.status === "archived" ? "red" : "green"}>{p.status}</Badge></td>
                  <td data-mobile-label="Order">{p.order}</td>
                  <td data-mobile-label="Updated"><time dateTime={p.updatedAt}>{new Date(p.updatedAt).toLocaleDateString()}</time></td>
                  <td data-mobile-label="Actions">
                    <div className="ctl-row-actions">
                      <button type="button" className="ctl-mini-btn" onClick={() => openEditor({ ...p }, false)}>Edit</button>
                      <details className="ctl-overflow-menu">
                        <summary aria-label={`More actions for ${p.title}`}><AdminIcon name="more" size={17} /></summary>
                        <div>
                          <button type="button" onClick={() => clone(p)}>Duplicate as draft</button>
                          {p.status !== "draft" && <a href={`/projects/${p.slug}`} target="_blank" rel="noopener noreferrer">View public page</a>}
                          <button type="button" className="danger" onClick={() => setToDelete(p)}>Delete project</button>
                        </div>
                      </details>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={!!editing}
        onClose={closeEditor}
        title={`${editing?.id ? "Edit project" : "New project"}${dirty ? " · unsaved" : ""}`}
        subtitle="Changes go live on the public site immediately (except drafts)."
        wide
        footer={
          <>
            <button type="button" className="ctl-btn ctl-btn--ghost" onClick={closeEditor}>Cancel</button>
            {editing?.id && (
              <a className="ctl-btn ctl-btn--secondary" href={`/projects/${editing.slug}`} target="_blank" rel="noopener noreferrer">Preview</a>
            )}
            <button type="button" className="ctl-btn ctl-btn--primary" onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : editing?.id ? "Save changes" : "Create project"}</button>
          </>
        }
      >
        {editing && (
          <>
            <Tabs tabs={tabs} value={tab} onChange={setTab} label="Project sections" />
            {tab === "basic" && (
              <div className="ctl-form-grid">
                <Field label="Title" required error={errors.title}>
                  {(id) => <input id={id} className="ctl-input" value={editing.title ?? ""} aria-invalid={Boolean(errors.title)} onChange={(e) => {
                    const title = e.target.value;
                    setEdit(slugLocked || editing.id ? { title } : { title, slug: slugify(title) });
                  }} autoComplete="off" />}
                </Field>
                <Field label="Slug (public URL)" required error={errors.slug} hint={editing.slug ? `Live at /projects/${editing.slug}` : undefined}>
                  {(id) => (
                    <span className="ctl-project-slug-row">
                      <input id={id} className="ctl-input ctl-input--grow" value={editing.slug ?? ""} aria-invalid={Boolean(errors.slug)} disabled={slugLocked && Boolean(editing.id)} onChange={(e) => setEdit({ slug: slugify(e.target.value) })} autoComplete="off" />
                      {editing.id && (
                        <button type="button" className="ctl-mini-btn" onClick={() => setSlugLocked((v) => !v)} aria-pressed={!slugLocked}>
                          {slugLocked ? "Unlock" : "Lock"}
                        </button>
                      )}
                    </span>
                  )}
                </Field>
                <Field label="Category" required error={errors.category}>
                  {(id) => <input id={id} className="ctl-input" value={editing.category ?? ""} aria-invalid={Boolean(errors.category)} onChange={(e) => setEdit({ category: e.target.value })} placeholder="AI / Computer Vision" />}
                </Field>
                <Field label="Codename" hint="Optional internal name">
                  {(id) => <input id={id} className="ctl-input" value={editing.codename ?? ""} onChange={(e) => setEdit({ codename: e.target.value })} />}
                </Field>
                <Field label="Year" required error={errors.year}>
                  {(id) => <input id={id} className="ctl-input" value={editing.year ?? ""} inputMode="numeric" aria-invalid={Boolean(errors.year)} onChange={(e) => setEdit({ year: e.target.value })} placeholder="2026" />}
                </Field>
                <Field label="Short description (card)" required error={errors.short} hint={`${(editing.shortDescription ?? "").length}/400`}>
                  {(id) => <textarea id={id} className="ctl-textarea" rows={2} maxLength={400} value={editing.shortDescription ?? ""} aria-invalid={Boolean(errors.short)} onChange={(e) => setEdit({ shortDescription: e.target.value })} />}
                </Field>
                <Field label="Long description" full>
                  {(id) => <textarea id={id} className="ctl-textarea" rows={4} value={editing.longDescription ?? ""} onChange={(e) => setEdit({ longDescription: e.target.value })} />}
                </Field>
              </div>
            )}
            {tab === "story" && (
              <div className="ctl-form-grid">
                <Field label="Problem" full>
                  {(id) => <textarea id={id} className="ctl-textarea" rows={3} value={editing.problem ?? ""} onChange={(e) => setEdit({ problem: e.target.value })} />}
                </Field>
                <Field label="Solution" full>
                  {(id) => <textarea id={id} className="ctl-textarea" rows={3} value={editing.solution ?? ""} onChange={(e) => setEdit({ solution: e.target.value })} />}
                </Field>
                <Field label="Architecture" full>
                  {(id) => <textarea id={id} className="ctl-textarea" rows={3} value={editing.architecture ?? ""} onChange={(e) => setEdit({ architecture: e.target.value })} />}
                </Field>
                <Field label="Decisions (one per line)" full>
                  {(id) => <textarea id={id} className="ctl-textarea" rows={3} value={(editing.decisions ?? []).join("\n")} onChange={(e) => setList("decisions", e.target.value)} />}
                </Field>
                <Field label="Data flow (one per line, use → for label → detail)" full>
                  {(id) => <textarea id={id} className="ctl-textarea" rows={3} value={(editing.dataFlow ?? []).join("\n")} onChange={(e) => setList("dataFlow", e.target.value)} placeholder="Capture → RTSP · webcam · upload" />}
                </Field>
                <Field label="Challenges" full>
                  {(id) => <textarea id={id} className="ctl-textarea" rows={2} value={editing.challenges ?? ""} onChange={(e) => setEdit({ challenges: e.target.value })} />}
                </Field>
                <Field label="Results" full>
                  {(id) => <textarea id={id} className="ctl-textarea" rows={2} value={editing.results ?? ""} onChange={(e) => setEdit({ results: e.target.value })} />}
                </Field>
                <Field label="Security notes (admin only — never public)" full hint="Stored but hidden from the public site.">
                  {(id) => <textarea id={id} className="ctl-textarea" rows={2} value={editing.securityNotes ?? ""} onChange={(e) => setEdit({ securityNotes: e.target.value })} />}
                </Field>
              </div>
            )}
            {tab === "media" && (
              <div className="ctl-form-grid">
                <Field label="Tech stack (comma-separated)" full>
                  {(id) => <input id={id} className="ctl-input" value={(editing.stack ?? []).join(", ")} onChange={(e) => setList("stack", e.target.value)} placeholder="FastAPI, MongoDB, Docker" />}
                </Field>
                <Field label="GitHub URL">
                  {(id) => <input id={id} className="ctl-input" type="url" inputMode="url" value={editing.githubUrl ?? ""} onChange={(e) => setEdit({ githubUrl: e.target.value })} placeholder="https://…" />}
                </Field>
                <Field label="Live URL">
                  {(id) => <input id={id} className="ctl-input" type="url" inputMode="url" value={editing.liveUrl ?? ""} onChange={(e) => setEdit({ liveUrl: e.target.value })} placeholder="https://…" />}
                </Field>
                <Field label="Hero image URL" full hint="Upload in Media first, then paste the /static/… URL.">
                  {(id) => <input id={id} className="ctl-input" value={(editing.heroImage as string | null) ?? ""} onChange={(e) => setEdit({ heroImage: e.target.value })} placeholder="/static/media/…" />}
                </Field>
                <Field label="Gallery URLs (one per line)" full>
                  {(id) => <textarea id={id} className="ctl-textarea" rows={3} value={(editing.gallery ?? []).join("\n")} onChange={(e) => setList("gallery", e.target.value)} placeholder="/static/media/… or https://…" />}
                </Field>
              </div>
            )}
            {tab === "publish" && (
              <div className="ctl-form-grid">
                <Field label="Tier">
                  {(id) => (
                    <select id={id} className="ctl-select" value={editing.tier ?? "featured"} onChange={(e) => setEdit({ tier: e.target.value as Project["tier"] })}>
                      {["featured", "secondary", "experiment", "academic", "legacy", "internship"].map((t) => (<option key={t} value={t}>{t}</option>))}
                    </select>
                  )}
                </Field>
                <Field label="Status" hint="Draft hides it publicly.">
                  {(id) => (
                    <select id={id} className="ctl-select" value={editing.status ?? "draft"} onChange={(e) => setEdit({ status: e.target.value as Project["status"] })}>
                      {["draft", "active", "complete", "maintained", "archived"].map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                  )}
                </Field>
                <Field label="Order (lower shows first)">
                  {(id) => <input id={id} className="ctl-input" type="number" min={0} max={9999} value={String(editing.order ?? 99)} onChange={(e) => setEdit({ order: Number(e.target.value) })} />}
                </Field>
                <Field label="Flags">
                  {(id) => <label htmlFor={id} className="ctl-featured-check"><input id={id} type="checkbox" checked={!!editing.featured} onChange={(e) => setEdit({ featured: e.target.checked })} /> Featured on homepage</label>}
                </Field>
              </div>
            )}
          </>
        )}
      </Drawer>

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
