import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { api } from "../../lib/api";
import type { Education } from "@hp/shared";
import { AdminIcon } from "./Icon";
import { ConfirmDialog, Dialog, EmptyState, ErrorState, PageHead, SearchInput, SkeletonList, friendlyError, useToast } from "./ui";
import { usePersistentState } from "./ui";

const EMPTY: Partial<Education> = {
  degree: "",
  institution: "",
  field: "",
  startYear: "",
  endYear: "",
  grade: "",
  description: "",
  primary: false,
  order: 99,
};

export function EducationAdmin() {
  const [items, setItems] = useState<Education[]>([]);
  const [editing, setEditing] = useState<Partial<Education> | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = usePersistentState<"cards" | "table">("ctl:education:view", "cards");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<Education | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { push } = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.admin.education();
      setItems(r.items);
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
    return [...items]
      .filter((item) => !q || `${item.degree} ${item.institution} ${item.field ?? ""}`.toLowerCase().includes(q))
      .sort((a, b) => b.startYear.localeCompare(a.startYear) || a.order - b.order);
  }, [items, query]);

  const setEdit = (patch: Partial<Education>) => {
    setEditing((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
  };

  const save = async () => {
    if (!editing?.degree?.trim() || !editing.institution?.trim() || !editing.startYear?.trim()) {
      push({ kind: "error", title: "Degree, institution and start year required" });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        degree: editing.degree.trim(),
        institution: editing.institution.trim(),
        field: editing.field?.trim() || null,
        startYear: editing.startYear.trim(),
        endYear: editing.endYear?.trim() || null,
        grade: editing.grade?.trim() || null,
        description: editing.description?.trim() || null,
        primary: Boolean(editing.primary),
        order: Number(editing.order ?? 99),
      };
      if (editing.id) await api.admin.updateEducation(editing.id, payload);
      else await api.admin.createEducation(payload);
      push({ kind: "success", title: editing.id ? "Education saved" : "Education created", desc: "Public education updated immediately." });
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
      await api.admin.deleteEducation(toDelete.id);
      push({ kind: "success", title: "Education deleted" });
      setToDelete(null);
      void load();
    } catch (e) {
      push({ kind: "error", title: "Delete failed", desc: friendlyError(e) });
    } finally {
      setBusy(false);
    }
  };

  const closeEditor = () => {
    if (dirty) setConfirmDiscard(true);
    else setEditing(null);
  };

  return (
    <>
      <PageHead
        title="Education"
        desc={`${filtered.length} of ${items.length} records · rendered on the public journey and recruiter view.`}
        actions={<><SearchInput value={query} onChange={setQuery} label="Search education" placeholder="Search education…" /><div className="ctl-view-toggle" role="group" aria-label="Education layout"><button className={view === "cards" ? "active" : ""} aria-pressed={view === "cards"} onClick={() => setView("cards")}><AdminIcon name="education" size={15} /><span>Cards</span></button><button className={view === "table" ? "active" : ""} aria-pressed={view === "table"} onClick={() => setView("table")}><AdminIcon name="audit" size={15} /><span>Table</span></button></div><button className="ctl-btn ctl-btn--primary" onClick={() => { setEditing({ ...EMPTY }); setDirty(false); }}>New record</button></>}
      />
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {loading && items.length === 0 ? <SkeletonList rows={5} /> : filtered.length === 0 ? (
        <EmptyState
          title={query ? `No results for “${query}”` : "No education records"}
          desc={query ? "Try a different search, or clear it." : "Add a degree or formal education record."}
          action={<button className="ctl-btn ctl-btn--primary" onClick={() => { setEditing({ ...EMPTY }); setDirty(false); }}>+ New record</button>}
        />
      ) : (
        view === "cards" ? <div className="ctl-education-list">
          {filtered.map((item) => <article className="ctl-education-card" key={item.id}>
            <div className="ctl-education-mark"><AdminIcon name="education" size={19} /></div>
            <div className="ctl-education-main"><h2>{item.degree}{item.primary && <span className="ctl-row-sub"> · Primary</span>}</h2><p>{item.institution}{item.field ? ` · ${item.field}` : ""}</p>{item.description && <p className="ctl-education-description">{item.description}</p>}{item.grade && <span className="ctl-education-grade">{item.grade}</span>}</div>
            <div className="ctl-education-side"><span className="ctl-education-years">{item.startYear} – {item.endYear ?? "Present"}</span><div className="ctl-row-actions"><button className="ctl-mini-btn" onClick={() => { setEditing({ ...item }); setDirty(false); }}>Edit</button><button className="ctl-mini-btn danger" onClick={() => setToDelete(item)}>Delete</button></div></div>
          </article>)}
        </div> : <div className="ctl-table-wrap">
          <table className="ctl-table">
            <thead><tr><th>Degree</th><th>Institution</th><th>Years</th><th>Grade</th><th>Order</th><th><span className="ctl-th-static">Actions</span></th></tr></thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td data-mobile-primary="Degree" data-mobile-label="Degree"><button className="ctl-link-btn" onClick={() => { setEditing({ ...item }); setDirty(false); }}>{item.degree}</button><div className="ctl-row-sub">{item.field ?? ""}</div></td>
                  <td data-mobile-label="Institution">{item.institution}</td>
                  <td data-mobile-label="Years">{item.startYear} – {item.endYear ?? "Present"}</td>
                  <td data-mobile-label="Grade">{item.grade ?? "—"}</td>
                  <td data-mobile-label="Order">{item.order}</td>
                  <td data-mobile-label="Actions"><div className="ctl-row-actions"><button className="ctl-mini-btn" onClick={() => { setEditing({ ...item }); setDirty(false); }}>Edit</button><button className="ctl-mini-btn danger" onClick={() => setToDelete(item)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onClose={closeEditor} title={`${editing?.id ? "Edit education" : "New education"}${dirty ? " · unsaved" : ""}`} actions={<><button className="ctl-btn ctl-btn--ghost" onClick={closeEditor}>Cancel</button><button className="ctl-btn ctl-btn--primary" onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : "Save"}</button></>}>
        {editing && (
          <div className="ctl-form-grid">
            <div className="ctl-field"><label htmlFor="ed-degree">Degree</label><input id="ed-degree" className="ctl-input" value={editing.degree ?? ""} onChange={(e) => setEdit({ degree: e.target.value })} /></div>
            <div className="ctl-field"><label htmlFor="ed-institution">Institution</label><input id="ed-institution" className="ctl-input" value={editing.institution ?? ""} onChange={(e) => setEdit({ institution: e.target.value })} /></div>
            <div className="ctl-field"><label htmlFor="ed-field">Field / specialization</label><input id="ed-field" className="ctl-input" value={editing.field ?? ""} onChange={(e) => setEdit({ field: e.target.value })} /></div>
            <div className="ctl-field"><label htmlFor="ed-grade">Grade</label><input id="ed-grade" className="ctl-input" value={editing.grade ?? ""} onChange={(e) => setEdit({ grade: e.target.value })} /></div>
            <div className="ctl-field"><label htmlFor="ed-start">Start year</label><input id="ed-start" className="ctl-input" value={editing.startYear ?? ""} onChange={(e) => setEdit({ startYear: e.target.value })} placeholder="2023" /></div>
            <div className="ctl-field"><label htmlFor="ed-end">End year (optional)</label><input id="ed-end" className="ctl-input" value={editing.endYear ?? ""} onChange={(e) => setEdit({ endYear: e.target.value })} placeholder="2027" /></div>
            <div className="ctl-field"><label htmlFor="ed-order">Order (lower shows first)</label><input id="ed-order" className="ctl-input" type="number" min="0" value={String(editing.order ?? 99)} onChange={(e) => setEdit({ order: Number(e.target.value) })} /></div>
            <div className="ctl-field"><label>Recruiter view</label><label className="ctl-featured-check"><input type="checkbox" checked={!!editing.primary} onChange={(e) => setEdit({ primary: e.target.checked })} /> Primary education</label></div>
            <div className="ctl-field full"><label htmlFor="ed-description">Description</label><textarea id="ed-description" className="ctl-textarea" rows={4} value={editing.description ?? ""} onChange={(e) => setEdit({ description: e.target.value })} /></div>
          </div>
        )}
      </Dialog>
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => void remove()} title={`Delete “${toDelete?.degree}”?`} description="This removes the record from the public journey and recruiter view." confirmLabel="Delete" busy={busy} />
      <ConfirmDialog open={confirmDiscard} onClose={() => setConfirmDiscard(false)} onConfirm={() => { setConfirmDiscard(false); setEditing(null); setDirty(false); }} title="Unsaved changes" description="Your changes have not been saved." confirmLabel="Discard" busy={false} />
    </>
  );
}
