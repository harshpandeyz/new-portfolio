import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { api, resolveMediaUrl } from "../../lib/api";
import type { Certificate } from "@hp/shared";
import { AdminIcon } from "./Icon";
import {
  Badge, ConfirmDialog, Drawer, EmptyState, ErrorState, Field, PageHead, Pagination, SearchInput,
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
  const [year, setYear] = usePersistentState("ctl:cert:year", "");
  const [view, setView] = usePersistentState<"gallery" | "table">("ctl:cert:view", "gallery");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
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
      const r = await api.admin.certificates({
        search: debouncedSearch || undefined,
        category: category === "ALL" ? undefined : category,
        year: /^\d{4}$/.test(year) ? year : undefined,
        page,
      }, signal);
      if (signal?.aborted) return;
      setItems(r.certificates);
      setTotal(r.total);
      setSelected((prev) => {
        const ids = new Set(r.certificates.map((c) => c.id));
        return new Set([...prev].filter((id) => ids.has(id)));
      });
    } catch (e) {
      if (!signal?.aborted) setError(friendlyError(e));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [debouncedSearch, category, year, page]);

  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load]);

  useEffect(() => setPage(1), [debouncedSearch, category, year]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing({ ...EMPTY });
      setErrors({});
      setDirty(false);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filtered = items;
  const pages = Math.max(1, Math.ceil(total / 24));

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
        setItems((list) => [created.certificate, ...list.filter((certificate) => certificate.id !== created.certificate.id)].slice(0, 24));
        setTotal((value) => value + 1);
        setPage(1);
        setSearch(""); setCategory("ALL"); setYear("");
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
      setTotal((value) => Math.max(0, value - done));
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
      setTotal((value) => Math.max(0, value - 1));
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
        desc={`${total} stored credentials · manage dates, verification links, featured status, and supporting documents.`}
        actions={
          <>
            <SearchInput value={search} onChange={setSearch} label="Search certificates" placeholder="Search title or issuer…" />
            <button type="button" className="ctl-btn ctl-btn--primary" onClick={() => { setEditing({ ...EMPTY }); setErrors({}); setDirty(false); }}>+ New certificate</button>
          </>
        }
      />
      <div className="ctl-list-toolbar">
        <select className="ctl-select ctl-filter-select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="Filter by category">
          {["ALL", "AI", "BACKEND", "CLOUD", "DATABASE", "DATA", "DEVELOPMENT", "SECURITY", "OTHER"].map((c) => (<option key={c} value={c}>{c === "ALL" ? "All categories" : c}</option>))}
        </select>
        <label className="ctl-year-filter"><span>Year</span><input className="ctl-input" inputMode="numeric" maxLength={4} value={year} onChange={(e) => { setYear(e.target.value.replace(/\D/g, "").slice(0, 4)); setPage(1); }} placeholder="All" aria-label="Filter certificates by year" /></label>
        <div className="ctl-view-toggle" role="group" aria-label="Certificate layout">
          <button type="button" aria-pressed={view === "gallery"} onClick={() => setView("gallery")}><AdminIcon name="media" size={15} />Gallery</button>
          <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}><AdminIcon name="projects" size={15} />Table</button>
        </div>
        {(search || category !== "ALL" || year) && <button type="button" className="ctl-mini-btn" onClick={() => { setSearch(""); setCategory("ALL"); setYear(""); setPage(1); }}>Clear filters</button>}
        {selected.size > 0 && (
          <div className="ctl-bulkbar" role="toolbar" aria-label="Bulk actions">
            <span>{selected.size} selected</span>
            <button type="button" className="ctl-mini-btn danger" disabled={busy} onClick={() => setConfirmBulkDelete(true)}>Delete…</button>
            <button type="button" className="ctl-mini-btn" disabled={busy} onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}
      </div>
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {loading ? (
        <SkeletonList rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search || year || category !== "ALL" ? "No matching certificates" : "No certificates"}
          desc={search || year || category !== "ALL" ? "Try changing the search or filters." : "Add a certificate to the public archive."}
          action={search || year || category !== "ALL" ? <button type="button" className="ctl-btn ctl-btn--secondary ctl-btn--sm" onClick={() => { setSearch(""); setCategory("ALL"); setYear(""); setPage(1); }}>Clear filters</button>
            : <button type="button" className="ctl-btn ctl-btn--primary" onClick={() => { setEditing({ ...EMPTY }); setErrors({}); setDirty(false); }}>+ New certificate</button>}
        />
      ) : view === "gallery" ? (
        <div className="ctl-certificate-grid">
          {filtered.map((certificate) => {
            const imageFile = Boolean(certificate.fileUrl && /\.(?:png|jpe?g|webp|avif|gif)(?:[?#]|$)/i.test(certificate.fileUrl));
            return (
              <article className="ctl-certificate-card" key={certificate.id}>
                {certificate.fileUrl ? (
                  <a className="ctl-certificate-thumb" href={resolveMediaUrl(certificate.fileUrl)} target="_blank" rel="noopener noreferrer" aria-label={`Preview ${certificate.title}`}>
                    {imageFile ? <img src={resolveMediaUrl(certificate.fileUrl)} alt="" loading="lazy" /> : <AdminIcon name="file" size={28} />}
                  </a>
                ) : <div className="ctl-certificate-thumb" aria-hidden="true"><AdminIcon name="certificates" size={28} /></div>}
                <div className="ctl-certificate-card-body">
                  <div className="ctl-certificate-issuer"><span className="ctl-issuer-mark" aria-hidden="true">{certificate.issuer.trim().slice(0, 1).toUpperCase() || "C"}</span><span>{certificate.issuer}</span></div>
                  <button type="button" className="ctl-link-btn" onClick={() => { setEditing({ ...certificate }); setErrors({}); setDirty(false); }}>{certificate.title}</button>
                  {certificate.description && <p>{certificate.description}</p>}
                  <div className="ctl-certificate-meta"><Badge tone="neutral">{certificate.category}</Badge>{certificate.issuedOn && <time dateTime={certificate.issuedOn}>{certificate.issuedOn.slice(0, 4)}</time>}{certificate.featured && <Badge tone="amber">Featured</Badge>}</div>
                  <div className="ctl-certificate-card-foot">
                    {certificate.credentialUrl ? <a href={certificate.credentialUrl} target="_blank" rel="noopener noreferrer"><AdminIcon name="external" size={14} />Verify</a> : <span className="ctl-hint">No verification link</span>}
                    <button type="button" className="ctl-btn ctl-btn--ghost ctl-btn--sm" onClick={() => { setEditing({ ...certificate }); setErrors({}); setDirty(false); }}>Edit</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="ctl-table-wrap">
          <table className="ctl-table">
            <thead><tr><th><input type="checkbox" checked={allChecked} onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((c) => c.id)) : new Set())} aria-label="Select all certificates" /></th><th>Title</th><th>Issuer</th><th>Category</th><th>Year</th><th><span className="ctl-th-static">Actions</span></th></tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className={selected.has(c.id) ? "selected" : ""}>
                  <td><input type="checkbox" checked={selected.has(c.id)} onChange={(e) => setSelected((prev) => { const n = new Set(prev); if (e.target.checked) n.add(c.id); else n.delete(c.id); return n; })} aria-label={`Select ${c.title}`} /></td>
                  <td data-mobile-primary><button type="button" className="ctl-link-btn" onClick={() => { setEditing({ ...c }); setErrors({}); setDirty(false); }}>{c.title}</button> {c.featured && <Badge tone="amber">Featured</Badge>}</td>
                  <td data-mobile-label="Issuer">{c.issuer}</td>
                  <td data-mobile-label="Category"><Badge tone="neutral">{c.category}</Badge></td>
                  <td data-mobile-label="Year">{c.issuedOn ? <time dateTime={c.issuedOn}>{c.issuedOn.slice(0, 4)}</time> : "Not recorded"}</td>
                  <td data-mobile-label="Actions">
                    <div className="ctl-row-actions">
                      <button type="button" className="ctl-mini-btn" onClick={() => { setEditing({ ...c }); setErrors({}); setDirty(false); }}>Edit</button>
                      {c.fileUrl && <a className="ctl-mini-btn" href={resolveMediaUrl(c.fileUrl)} target="_blank" rel="noopener noreferrer" aria-label={`Open document for ${c.title}`}>View doc</a>}
                      <button type="button" className="ctl-mini-btn danger" onClick={() => setToDelete(c)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {total > 24 && <Pagination page={page} pages={pages} total={total} onPage={setPage} />}
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
                <span className="ctl-cert-link-row">
                  <input
                    id={id}
                    value={editing.fileUrl ?? ""}
                    onChange={(e) => setEdit({ fileUrl: e.target.value })}
                    placeholder="/static/media/…"
                    className="ctl-input ctl-cert-link-input"
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
              {(id) => <label htmlFor={id} className="ctl-featured-check"><input id={id} type="checkbox" checked={!!editing.featured} onChange={(e) => setEdit({ featured: e.target.checked })} /> Featured</label>}
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
