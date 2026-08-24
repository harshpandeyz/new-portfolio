import { useCallback, useEffect, useState } from "react";

import { api } from "../../lib/api";
import type { Project } from "@hp/shared";
import { ArrayInput, ErrorNote, Field, Select, TextArea, TextInput } from "./fields";

const EMPTY: Partial<Project> = {
  title: "", slug: "", codename: "", shortDescription: "", longDescription: "",
  category: "AI / COMPUTER VISION", tier: "featured", status: "draft", featured: false,
  year: String(new Date().getFullYear()), order: 99, stack: [], githubUrl: "", liveUrl: "",
  problem: "", solution: "", architecture: "", decisions: [], challenges: "", results: "",
  securityNotes: "", dataFlow: [], gallery: [],
};

export function ProjectsAdmin() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Partial<Project> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.admin.projects().then((r) => setProjects(r.projects)).catch((e) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      if (editing.id) await api.admin.updateProject(editing.id, editing);
      else await api.admin.createProject(editing);
      setEditing(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: Project) => {
    if (!window.confirm(`Delete "${p.title}" permanently?`)) return;
    await api.admin.deleteProject(p.id).catch((e) => setError(e.message));
    load();
  };

  return (
    <>
      <div className="admin-head">
        <h1>Projects ({projects.length})</h1>
        <div className="actions">
          <button className="btn btn-sm btn-solid" onClick={() => setEditing({ ...EMPTY })}>+ NEW PROJECT</button>
        </div>
      </div>
      <ErrorNote error={error} />

      {editing ? (
        <div className="editor-panel">
          <div className="editor-section">
            <h3>IDENTITY</h3>
            <div className="editor-grid">
              <Field label="TITLE"><TextInput value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
              <Field label="SLUG (kebab-case)"><TextInput value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") })} /></Field>
              <Field label="CODENAME"><TextInput value={editing.codename ?? ""} onChange={(e) => setEditing({ ...editing, codename: e.target.value })} /></Field>
              <Field label="CATEGORY"><TextInput value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></Field>
              <Field label="TIER">
                <Select value={editing.tier ?? "featured"} onChange={(e) => setEditing({ ...editing, tier: e.target.value as Project["tier"] })}
                  options={[
                    { value: "featured", label: "FEATURED" }, { value: "secondary", label: "SECONDARY" },
                    { value: "experiment", label: "EXPERIMENT" }, { value: "academic", label: "ACADEMIC" },
                    { value: "legacy", label: "LEGACY" }, { value: "internship", label: "INTERNSHIP" },
                  ]} />
              </Field>
              <Field label="STATUS">
                <Select value={editing.status ?? "draft"} onChange={(e) => setEditing({ ...editing, status: e.target.value as Project["status"] })}
                  options={[
                    { value: "draft", label: "DRAFT (hidden)" }, { value: "active", label: "ACTIVE" },
                    { value: "complete", label: "COMPLETE" }, { value: "maintained", label: "MAINTAINED" },
                    { value: "archived", label: "ARCHIVED" },
                  ]} />
              </Field>
              <Field label="YEAR"><TextInput value={editing.year ?? ""} onChange={(e) => setEditing({ ...editing, year: e.target.value })} /></Field>
              <Field label="ORDER"><TextInput type="number" value={String(editing.order ?? 99)} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} /></Field>
              <Field label="FLAGS" full>
                <label className="checkbox"><input type="checkbox" checked={editing.featured ?? false} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} /> FEATURED (hero constellation)</label>
              </Field>
            </div>
          </div>

          <div className="editor-section">
            <h3>NARRATIVE</h3>
            <div className="editor-grid">
              <Field label="SHORT DESCRIPTION" full><TextArea rows={2} value={editing.shortDescription ?? ""} onChange={(e) => setEditing({ ...editing, shortDescription: e.target.value })} /></Field>
              <Field label="LONG DESCRIPTION" full><TextArea rows={4} value={editing.longDescription ?? ""} onChange={(e) => setEditing({ ...editing, longDescription: e.target.value })} /></Field>
              <Field label="PROBLEM" full><TextArea rows={3} value={editing.problem ?? ""} onChange={(e) => setEditing({ ...editing, problem: e.target.value })} /></Field>
              <Field label="SOLUTION" full><TextArea rows={3} value={editing.solution ?? ""} onChange={(e) => setEditing({ ...editing, solution: e.target.value })} /></Field>
              <Field label="ARCHITECTURE" full><TextArea rows={3} value={editing.architecture ?? ""} onChange={(e) => setEditing({ ...editing, architecture: e.target.value })} /></Field>
              <Field label="CHALLENGES" full><TextArea rows={2} value={editing.challenges ?? ""} onChange={(e) => setEditing({ ...editing, challenges: e.target.value })} /></Field>
              <Field label="RESULTS / LEARNINGS" full><TextArea rows={2} value={editing.results ?? ""} onChange={(e) => setEditing({ ...editing, results: e.target.value })} /></Field>
            </div>
          </div>

          <div className="editor-section">
            <h3>ENGINEERING DETAIL</h3>
            <div className="editor-grid">
              <Field label="TECH STACK" full><ArrayInput value={editing.stack ?? []} onChange={(v) => setEditing({ ...editing, stack: v })} placeholder="e.g. FastAPI — press Enter" /></Field>
              <Field label="ENGINEERING DECISIONS" full><ArrayInput value={editing.decisions ?? []} onChange={(v) => setEditing({ ...editing, decisions: v })} /></Field>
              <Field label="DATA FLOW STEPS (drives the architecture diagram)" full><ArrayInput value={editing.dataFlow ?? []} onChange={(v) => setEditing({ ...editing, dataFlow: v })} /></Field>
              <Field label="SECURITY NOTES (separate with ·)" full><TextArea rows={2} value={editing.securityNotes ?? ""} onChange={(e) => setEditing({ ...editing, securityNotes: e.target.value })} /></Field>
            </div>
          </div>

          <div className="editor-section">
            <h3>LINKS & MEDIA</h3>
            <div className="editor-grid">
              <Field label="GITHUB URL"><TextInput value={editing.githubUrl ?? ""} onChange={(e) => setEditing({ ...editing, githubUrl: e.target.value })} /></Field>
              <Field label="LIVE URL"><TextInput value={editing.liveUrl ?? ""} onChange={(e) => setEditing({ ...editing, liveUrl: e.target.value })} /></Field>
              <Field label="HERO IMAGE URL" full><TextInput value={editing.heroImage ?? ""} onChange={(e) => setEditing({ ...editing, heroImage: e.target.value })} placeholder="/static/media/… (upload in MEDIA first)" /></Field>
            </div>
          </div>

          <div className="editor-foot">
            <button className="btn" onClick={() => setEditing(null)}>CANCEL</button>
            <button className="btn btn-solid" onClick={save} disabled={busy}>{busy ? "SAVING…" : editing.id ? "SAVE CHANGES" : "CREATE PROJECT"}</button>
          </div>
        </div>
      ) : (
        <div className="admin-table">
          <table>
            <thead>
              <tr><th>TITLE</th><th>SLUG</th><th>TIER</th><th>STATUS</th><th>ORDER</th><th>UPDATED</th><th></th></tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td><span className="title">{p.title}</span>{p.featured && <span style={{ color: "var(--warn)", marginLeft: 8 }}>★</span>}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{p.slug}</td>
                  <td>{p.tier}</td>
                  <td>{p.status}</td>
                  <td>{p.order}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{new Date(p.updatedAt).toLocaleDateString()}</td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => setEditing(p)}>EDIT</button>
                      <a href={`/projects/${p.slug}`} target="_blank" rel="noopener noreferrer">VIEW</a>
                      <button className="danger" onClick={() => remove(p)}>DEL</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
