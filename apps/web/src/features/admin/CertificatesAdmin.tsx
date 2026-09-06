import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { api, resolveMediaUrl } from "../../lib/api";
import type { Certificate } from "@hp/shared";
import { Badge, ConfirmDialog, Dialog, EmptyState, ErrorState, PageHead, friendlyError, usePersistentState, useToast } from "./ui";

const EMPTY: Partial<Certificate> = {
  title: "", issuer: "", issuedOn: "", category: "DEVELOPMENT", credentialId: "",
  credentialUrl: "", fileUrl: "", description: "", featured: false, order: 99,
};

export function CertificatesAdmin() {
  const [items, setItems] = useState<Certificate[]>([]);
  const [editing, setEditing] = useState<Partial<Certificate> | null>(null);
  const [search, setSearch] = usePersistentState("ctl:cert:q", "");
  const [category, setCategory] = usePersistentState("ctl:cert:cat", "ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<Certificate | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { push } = useToast();

  const load = async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.admin.certificates({ search: q ?? search });
      setItems(r.certificates);
      setSelected(new Set());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing({ ...EMPTY });
      setDirty(false);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filtered = useMemo(
    () => items.filter((c) => (category === "ALL" ? true : c.category === category)),
    [items, category],
  );

  const setEdit = (patch: Partial<Certificate>) => {
    setEditing((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
  };

  const save = async () => {
    if (!editing?.title?.trim() || !editing?.issuer?.trim()) {
      push({ kind: "error", title: "Missing fields", desc: "Title and issuer are required." });
      return;
    }
    setBusy(true);
    try {
      const payload = { ...editing, issuedOn: editing.issuedOn || null };
      if (editing.id) await api.admin.updateCertificate(editing.id, payload);
      else await api.admin.createCertificate(payload);
      push({ kind: "success", title: editing.id ? "Certificate saved" : "Certificate created" });
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
        await api.admin.deleteCertificate(id);
        done += 1;
      } catch {
        failed += 1;
      }
    }
    setBusy(false);
    setConfirmBulkDelete(false);
    if (done > 0) push({ kind: "success", title: `Deleted ${done} certificate${done === 1 ? "" : "s"}` });
    if (failed > 0) push({ kind: "error", title: `Could not delete ${failed}`, desc: "Some items may require admin role." });
    void load();
  };

  const closeEditor = () => {
    if (dirty) setConfirmDiscard(true);
    else setEditing(null);
  };

  const allChecked = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await api.admin.deleteCertificate(toDelete.id);
      push({ kind: "success", title: "Certificate deleted" });
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
      <PageHead
        title="Certificates"
        desc={`${filtered.length} of ${items.length} certificate${items.length === 1 ? "" : "s"} · featured items surface publicly.`}
        actions={
          <>
            <input className="ctl-input ctl-search" placeholder="Search title or issuer…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search certificates" />
            <button className="ctl-btn ctl-btn--primary" onClick={() => { setEditing({ ...EMPTY }); setDirty(false); }}>+ New</button>
          </>
        }
      />
      <div className="ctl-toolbar">
        <select className="ctl-select" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "auto" }} aria-label="Filter by category">
          {["ALL", "AI", "BACKEND", "CLOUD", "DATABASE", "DATA", "DEVELOPMENT", "SECURITY", "OTHER"].map((c) => (<option key={c} value={c}>{c === "ALL" ? "All categories" : c}</option>))}
        </select>
        {(search || category !== "ALL") && <button className="ctl-mini-btn" onClick={() => { setSearch(""); setCategory("ALL"); }}>Clear filters</button>}
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
        <div className="ctl-card"><p style={{ color: "#8a93a3" }}>Loading…</p></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? `No results for “${search}”` : "No certificates"}
          desc={search ? "Try a different search, or clear filters." : "Add a new certificate to populate the archive."}
          action={search ? <button className="ctl-btn ctl-btn--secondary ctl-btn--sm" onClick={() => { setSearch(""); setCategory("ALL"); }}>Clear search</button>
            : <button className="ctl-btn ctl-btn--primary" onClick={() => { setEditing({ ...EMPTY }); setDirty(false); }}>+ New certificate</button>}
        />
      ) : (
        <div className="ctl-table-wrap">
          <table className="ctl-table">
            <thead><tr><th><input type="checkbox" checked={allChecked} onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((c) => c.id)) : new Set())} aria-label="Select all certificates" /></th><th>Title</th><th>Issuer</th><th>Category</th><th>Date</th><th><span className="ctl-th-static">Actions</span></th></tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className={selected.has(c.id) ? "selected" : ""}>
                  <td><input type="checkbox" checked={selected.has(c.id)} onChange={(e) => setSelected((prev) => { const n = new Set(prev); if (e.target.checked) n.add(c.id); else n.delete(c.id); return n; })} aria-label={`Select ${c.title}`} /></td>
                  <td><button className="ctl-link-btn" onClick={() => { setEditing({ ...c }); setDirty(false); }}>{c.title}</button> {c.featured && <Badge tone="amber">FEATURED</Badge>}</td>
                  <td>{c.issuer}</td>
                  <td><Badge tone="neutral">{c.category}</Badge></td>
                  <td style={{ whiteSpace: "nowrap" }}>{c.issuedOn ?? "—"}</td>
                  <td>
                    <div className="ctl-row-actions">
                      <button className="ctl-mini-btn" onClick={() => { setEditing({ ...c }); setDirty(false); }}>Edit</button>
                      {c.fileUrl && <a className="ctl-mini-btn" style={{ textDecoration: "none" }} href={resolveMediaUrl(c.fileUrl)} target="_blank" rel="noopener noreferrer">Doc</a>}
                      <button className="ctl-mini-btn danger" onClick={() => setToDelete(c)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={!!editing} onClose={closeEditor} title={`${editing?.id ? "Edit certificate" : "New certificate"}${dirty ? " · unsaved" : ""}`} wide
        actions={<><button className="ctl-btn ctl-btn--ghost" onClick={closeEditor}>Cancel</button><button className="ctl-btn ctl-btn--primary" onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : "Save"}</button></>}>
        {editing && (
          <div className="ctl-form-grid">
            <div className="ctl-field full"><label htmlFor="ct-title">Title</label><input id="ct-title" className="ctl-input" value={editing.title ?? ""} onChange={(e) => setEdit({ title: e.target.value })} /></div>
            <div className="ctl-field"><label htmlFor="ct-issuer">Issuer</label><input id="ct-issuer" className="ctl-input" value={editing.issuer ?? ""} onChange={(e) => setEdit({ issuer: e.target.value })} /></div>
            <div className="ctl-field"><label htmlFor="ct-date">Issued on</label><input id="ct-date" className="ctl-input" value={editing.issuedOn ?? ""} onChange={(e) => setEdit({ issuedOn: e.target.value })} placeholder="YYYY-MM-DD" /></div>
            <div className="ctl-field"><label htmlFor="ct-cat">Category</label>
              <select id="ct-cat" className="ctl-select" value={editing.category ?? "DEVELOPMENT"} onChange={(e) => setEdit({ category: e.target.value as Certificate["category"] })}>
                {["AI", "BACKEND", "CLOUD", "DATABASE", "DATA", "DEVELOPMENT", "SECURITY", "OTHER"].map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <div className="ctl-field"><label htmlFor="ct-order">Order (lower shows first)</label><input id="ct-order" className="ctl-input" type="number" value={String(editing.order ?? 99)} onChange={(e) => setEdit({ order: Number(e.target.value) })} /></div>
            <div className="ctl-field full"><label htmlFor="ct-doc">Document URL</label><input id="ct-doc" className="ctl-input" value={editing.fileUrl ?? ""} onChange={(e) => setEdit({ fileUrl: e.target.value })} placeholder="/static/media/…" /></div>
            <div className="ctl-field full"><label htmlFor="ct-url">Credential URL (verification link)</label><input id="ct-url" className="ctl-input" type="url" inputMode="url" value={editing.credentialUrl ?? ""} onChange={(e) => setEdit({ credentialUrl: e.target.value })} /></div>
            <div className="ctl-field full"><label htmlFor="ct-desc">Description</label><textarea id="ct-desc" className="ctl-textarea" rows={2} value={editing.description ?? ""} onChange={(e) => setEdit({ description: e.target.value })} /></div>
            <div className="ctl-field"><label>Flags</label><label style={{ fontSize: 13 }}><input type="checkbox" checked={!!editing.featured} onChange={(e) => setEdit({ featured: e.target.checked })} /> Featured</label></div>
          </div>
        )}
      </Dialog>
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => void remove()} title={`Delete "${toDelete?.title}"?`} description="This removes the certificate from the public site." confirmLabel="Delete" busy={busy} />
      <ConfirmDialog
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={() => void bulkDelete()}
        title={`Delete ${selected.size} certificates?`}
        description="Every selected certificate is permanently removed."
        confirmLabel={`Delete ${selected.size}`}
        busy={busy}
      />
      <ConfirmDialog open={confirmDiscard} onClose={() => setConfirmDiscard(false)} onConfirm={() => { setConfirmDiscard(false); setEditing(null); setDirty(false); }} title="Unsaved changes" description="Your changes have not been saved." confirmLabel="Discard" busy={false} />
    </>
  );
}
