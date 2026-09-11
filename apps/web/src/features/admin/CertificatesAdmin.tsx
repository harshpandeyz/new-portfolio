import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { api, resolveMediaUrl } from "../../lib/api";
import type { Certificate } from "@hp/shared";
import {
  Badge, ConfirmDialog, Drawer, EmptyState, ErrorState, Field, PageHead, SearchInput,
  SkeletonList, friendlyError, useDebouncedValue, usePersistentState, useToast,
} from "./ui";

const EMPTY: Partial<Certificate> = {
  title: "", issuer: "", issuedOn: "", category: "DEVELOPMENT", credentialId: "",
  credentialUrl: "", fileUrl: "", description: "", featured: false, order: 99,
};

function validate(d: Partial<Certificate>): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.title?.trim()) e.title = "Title is required.";
  if (!d.issuer?.trim()) e.issuer = "Issuer is required.";
  if (d.issuedOn && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(d.issuedOn.trim())) e.date = "Use YYYY, YYYY-MM, or YYYY-MM-DD.";
  return e;
}

export function CertificatesAdmin() {
  const [items, setItems] = useState<Certificate[]>([]);
  const [editing, setEditing] = useState<Partial<Certificate> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
  const [uploading, setUploading] = useState(false);
  const documentRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { push } = useToast();

  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.admin.certificates({ search: debouncedSearch || undefined });
      if (signal?.aborted) return;
      setItems(r.certificates);
      setSelected((prev) => {
        const ids = new Set(r.certificates.map((c) => c.id));
        return new Set([...prev].filter((id) => ids.has(id)));
      });
    } catch (e) {
      if (!signal?.aborted) setError(friendlyError(e));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing({ ...EMPTY });
      setErrors({});
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

  const uploadDocument = async (file: File) => {
    setUploading(true);
    try {
      const asset = await api.admin.uploadMedia(file);
      setEdit({ fileUrl: asset.url });
      push({ kind: "success", title: "Document uploaded", desc: "Save the certificate to publish the new document." });
    } catch (e) {
      push({ kind: "error", title: "Upload failed", desc: friendlyError(e) });
    } finally {
      setUploading(false);
      if (documentRef.current) documentRef.current.value = "";
    }
  };

  const save = async () => {
    if (!editing || busy) return;
    const v = validate(editing);
    setErrors(v);
    if (Object.keys(v).length > 0) {
      push({ kind: "error", title: "Check the highlighted fields" });
      return;
    }
    setBusy(true);
    try {
      const payload = { ...editing, issuedOn: editing.issuedOn?.trim() || null };
      if (editing.id) {
        const updated = await api.admin.updateCertificate(editing.id, payload);
        setItems((list) => list.map((c) => (c.id === editing.id ? updated.certificate : c)));
        push({ kind: "success", title: "Certificate saved" });
      } else {
        const created = await api.admin.createCertificate(payload);
        setItems((list) => [created.certificate, ...list]);
        push({ kind: "success", title: "Certificate created" });
      }
      setEditing(null);
      setDirty(false);
    } catch (e) {
      push({ kind: "error", title: "Save failed", desc: friendlyError(e) });
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
        await api.admin.deleteCertificate(id);
        done += 1;
      } catch {
        failed += 1;
      }
    }
    setBusy(false);
    setConfirmBulkDelete(false);
    setSelected(new Set());
    if (done > 0) {
      setItems((list) => list.filter((c) => !ids.includes(c.id)));
      push({ kind: "success", title: `Deleted ${done} certificate${done === 1 ? "" : "s"}` });
    }
    if (failed > 0) push({ kind: "error", title: `Could not delete ${failed}`, desc: "Some items may require admin role." });
  };

  const closeEditor = () => {
    if (dirty && !uploading) setConfirmDiscard(true);
    else if (!uploading) setEditing(null);
  };

  const allChecked = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  const remove = async () => {
    if (!toDelete || busy) return;
    setBusy(true);
    try {
      await api.admin.deleteCertificate(toDelete.id);
      setItems((list) => list.filter((c) => c.id !== toDelete.id));
      push({ kind: "success", title: "Certificate deleted" });
      setToDelete(null);
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
            <SearchInput value={search} onChange={setSearch} label="Search certificates" placeholder="Search title or issuer…" />
            <button type="button" className="ctl-btn ctl-btn--primary" onClick={() => { setEditing({ ...EMPTY }); setErrors({}); setDirty(false); }}>+ New certificate</button>
          </>
        }
      />
      <div className="ctl-list-toolbar">
        <select className="ctl-select" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "auto" }} aria-label="Filter by category">
          {["ALL", "AI", "BACKEND", "CLOUD", "DATABASE", "DATA", "DEVELOPMENT", "SECURITY", "OTHER"].map((c) => (<option key={c} value={c}>{c === "ALL" ? "All categories" : c}</option>))}
        </select>
        {(search || category !== "ALL") && <button type="button" className="ctl-mini-btn" onClick={() => { setSearch(""); setCategory("ALL"); }}>Clear filters</button>}
        {selected.size > 0 && (
          <div className="ctl-bulkbar" role="toolbar" aria-label="Bulk actions">
            <span>{selected.size} selected</span>
            <button type="button" className="ctl-mini-btn danger" disabled={busy} onClick={() => setConfirmBulkDelete(true)}>Delete…</button>
            <button type="button" className="ctl-mini-btn" disabled={busy} onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}
      </div>
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {loading && items.length === 0 ? (
        <SkeletonList rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? `No results for “${search}”` : "No certificates"}
          desc={search ? "Try a different search, or clear filters." : "Add a new certificate to populate the archive."}
          action={search ? <button type="button" className="ctl-btn ctl-btn--secondary ctl-btn--sm" onClick={() => { setSearch(""); setCategory("ALL"); }}>Clear search</button>
            : <button type="button" className="ctl-btn ctl-btn--primary" onClick={() => { setEditing({ ...EMPTY }); setErrors({}); setDirty(false); }}>+ New certificate</button>}
        />
      ) : (
        <div className="ctl-table-wrap">
          <table className="ctl-table">
            <thead><tr><th><input type="checkbox" checked={allChecked} onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((c) => c.id)) : new Set())} aria-label="Select all certificates" /></th><th>Title</th><th>Issuer</th><th>Category</th><th>Date</th><th><span className="ctl-th-static">Actions</span></th></tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className={selected.has(c.id) ? "selected" : ""}>
                  <td><input type="checkbox" checked={selected.has(c.id)} onChange={(e) => setSelected((prev) => { const n = new Set(prev); if (e.target.checked) n.add(c.id); else n.delete(c.id); return n; })} aria-label={`Select ${c.title}`} /></td>
                  <td><button type="button" className="ctl-link-btn" onClick={() => { setEditing({ ...c }); setErrors({}); setDirty(false); }}>{c.title}</button> {c.featured && <Badge tone="amber">FEATURED</Badge>}</td>
                  <td>{c.issuer}</td>
                  <td><Badge tone="neutral">{c.category}</Badge></td>
                  <td style={{ whiteSpace: "nowrap" }}>{c.issuedOn ? <time dateTime={c.issuedOn}>{c.issuedOn}</time> : "—"}</td>
                  <td>
                    <div className="ctl-row-actions">
                      <button type="button" className="ctl-mini-btn" onClick={() => { setEditing({ ...c }); setErrors({}); setDirty(false); }}>Edit</button>
                      {c.fileUrl && <a className="ctl-mini-btn" style={{ textDecoration: "none" }} href={resolveMediaUrl(c.fileUrl)} target="_blank" rel="noopener noreferrer" aria-label={`Open document for ${c.title}`}>View doc</a>}
                      <button type="button" className="ctl-mini-btn danger" onClick={() => setToDelete(c)}>Delete</button>
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
        title={`${editing?.id ? "Edit certificate" : "New certificate"}${dirty ? " · unsaved" : ""}`}
        subtitle="Featured items surface on the public homepage."
        footer={
          <>
            <button type="button" className="ctl-btn ctl-btn--ghost" onClick={closeEditor}>Cancel</button>
            <button type="button" className="ctl-btn ctl-btn--primary" onClick={() => void save()} disabled={busy || uploading}>{busy ? "Saving…" : "Save"}</button>
          </>
        }
      >
        {editing && (
          <div className="ctl-form-grid">
            <Field label="Title" required error={errors.title} full>
              {(id) => <input id={id} className="ctl-input" value={editing.title ?? ""} aria-invalid={Boolean(errors.title)} onChange={(e) => setEdit({ title: e.target.value })} autoComplete="off" />}
            </Field>
            <Field label="Issuer" required error={errors.issuer}>
              {(id) => <input id={id} className="ctl-input" value={editing.issuer ?? ""} aria-invalid={Boolean(errors.issuer)} onChange={(e) => setEdit({ issuer: e.target.value })} />}
            </Field>
            <Field label="Issued on" error={errors.date} hint="YYYY, YYYY-MM, or YYYY-MM-DD.">
              {(id) => <input id={id} className="ctl-input" type="date" value={/^\d{4}-\d{2}-\d{2}$/.test(editing.issuedOn ?? "") ? editing.issuedOn ?? "" : ""} aria-invalid={Boolean(errors.date)} onChange={(e) => setEdit({ issuedOn: e.target.value })} />}
            </Field>
            <Field label="Category">
              {(id) => (
                <select id={id} className="ctl-select" value={editing.category ?? "DEVELOPMENT"} onChange={(e) => setEdit({ category: e.target.value as Certificate["category"] })}>
                  {["AI", "BACKEND", "CLOUD", "DATABASE", "DATA", "DEVELOPMENT", "SECURITY", "OTHER"].map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              )}
            </Field>
            <Field label="Credential ID" hint="Shown publicly next to the issuer.">
              {(id) => <input id={id} className="ctl-input" value={editing.credentialId ?? ""} onChange={(e) => setEdit({ credentialId: e.target.value })} placeholder="e.g. MDB9mfxbechpm" />}
            </Field>
            <Field label="Order (lower shows first)">
              {(id) => <input id={id} className="ctl-input" type="number" min={0} max={9999} value={String(editing.order ?? 99)} onChange={(e) => setEdit({ order: Number(e.target.value) })} />}
            </Field>
            <Field label="Document" full hint="PDF or image. Uploads immediately; save to publish.">
              {(id) => (
                <span style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    id={id}
                    className="ctl-input"
                    value={editing.fileUrl ?? ""}
                    onChange={(e) => setEdit({ fileUrl: e.target.value })}
                    placeholder="/static/media/…"
                    style={{ flex: 1, minWidth: 200 }}
                  />
                  <input ref={documentRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && void uploadDocument(e.target.files[0])} />
                  <button type="button" className="ctl-btn ctl-btn--ghost ctl-btn--sm" onClick={() => documentRef.current?.click()} disabled={uploading}>{uploading ? "Uploading…" : editing.fileUrl ? "Replace" : "Upload"}</button>
                  {editing.fileUrl && <a className="ctl-mini-btn" href={resolveMediaUrl(editing.fileUrl)} target="_blank" rel="noopener noreferrer">Preview</a>}
                </span>
              )}
            </Field>
            <Field label="Credential URL (verification link)" full>
              {(id) => <input id={id} className="ctl-input" type="url" inputMode="url" value={editing.credentialUrl ?? ""} onChange={(e) => setEdit({ credentialUrl: e.target.value })} placeholder="https://…" />}
            </Field>
            <Field label="Description" full>
              {(id) => <textarea id={id} className="ctl-textarea" rows={3} value={editing.description ?? ""} onChange={(e) => setEdit({ description: e.target.value })} />}
            </Field>
            <Field label="Flags">
              {(id) => <label htmlFor={id} style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}><input id={id} type="checkbox" checked={!!editing.featured} onChange={(e) => setEdit({ featured: e.target.checked })} /> Featured</label>}
            </Field>
          </div>
        )}
      </Drawer>
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
