import { useCallback, useEffect, useState } from "react";

import { api } from "../../lib/api";
import type { Certificate } from "@hp/shared";
import { ErrorNote, Field, Select, TextArea, TextInput } from "./fields";

const EMPTY: Partial<Certificate> = {
  title: "", issuer: "", issuedOn: "", category: "DEVELOPMENT", credentialId: "",
  credentialUrl: "", fileUrl: "", description: "", featured: false, order: 99,
};

export function CertificatesAdmin() {
  const [items, setItems] = useState<Certificate[]>([]);
  const [editing, setEditing] = useState<Partial<Certificate> | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.admin.certificates({ search }).then((r) => setItems(r.certificates)).catch((e) => setError(e.message));
  }, [search]);

  useEffect(() => {
    const t = window.setTimeout(load, 200);
    return () => window.clearTimeout(t);
  }, [load]);

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const payload = { ...editing, issuedOn: editing.issuedOn || null };
      if (editing.id) await api.admin.updateCertificate(editing.id, payload);
      else await api.admin.createCertificate(payload);
      setEditing(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: Certificate) => {
    if (!window.confirm(`Delete certificate "${c.title}"?`)) return;
    await api.admin.deleteCertificate(c.id).catch((e) => setError(e.message));
    load();
  };

  return (
    <>
      <div className="admin-head">
        <h1>Certificates ({items.length} shown)</h1>
        <div className="actions">
          <input className="input admin-search" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn btn-sm btn-solid" onClick={() => setEditing({ ...EMPTY })}>+ NEW</button>
        </div>
      </div>
      <ErrorNote error={error} />

      {editing ? (
        <div className="editor-panel">
          <div className="editor-section">
            <h3>CREDENTIAL RECORD</h3>
            <div className="editor-grid">
              <Field label="TITLE" full><TextInput value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
              <Field label="ISSUER"><TextInput value={editing.issuer ?? ""} onChange={(e) => setEditing({ ...editing, issuer: e.target.value })} /></Field>
              <Field label="ISSUED ON (YYYY-MM-DD or blank)"><TextInput value={editing.issuedOn ?? ""} onChange={(e) => setEditing({ ...editing, issuedOn: e.target.value })} placeholder="Leave blank if not on the document" /></Field>
              <Field label="CATEGORY">
                <Select value={editing.category ?? "DEVELOPMENT"} onChange={(e) => setEditing({ ...editing, category: e.target.value as Certificate["category"] })}
                  options={["AI", "BACKEND", "CLOUD", "DATABASE", "DATA", "DEVELOPMENT", "SECURITY", "OTHER"].map((c) => ({ value: c, label: c }))} />
              </Field>
              <Field label="CREDENTIAL ID"><TextInput value={editing.credentialId ?? ""} onChange={(e) => setEditing({ ...editing, credentialId: e.target.value })} /></Field>
              <Field label="DOCUMENT URL" full><TextInput value={editing.fileUrl ?? ""} onChange={(e) => setEditing({ ...editing, fileUrl: e.target.value })} placeholder="/static/certificates/… (upload via MEDIA)" /></Field>
              <Field label="CREDENTIAL URL (verification link)" full><TextInput value={editing.credentialUrl ?? ""} onChange={(e) => setEditing({ ...editing, credentialUrl: e.target.value })} /></Field>
              <Field label="DESCRIPTION" full><TextArea rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
              <Field label="ORDER"><TextInput type="number" value={String(editing.order ?? 99)} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} /></Field>
              <Field label="FLAGS">
                <label className="checkbox"><input type="checkbox" checked={editing.featured ?? false} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} /> FEATURED</label>
              </Field>
            </div>
          </div>
          <div className="editor-foot">
            <button className="btn" onClick={() => setEditing(null)}>CANCEL</button>
            <button className="btn btn-solid" onClick={save} disabled={busy}>{busy ? "SAVING…" : editing.id ? "SAVE" : "CREATE"}</button>
          </div>
        </div>
      ) : (
        <div className="admin-table">
          <table>
            <thead><tr><th>TITLE</th><th>ISSUER</th><th>CATEGORY</th><th>DATE</th><th></th></tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td><span className="title">{c.title}</span></td>
                  <td>{c.issuer}</td>
                  <td>{c.category}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{c.issuedOn ?? "—"}</td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => setEditing(c)}>EDIT</button>
                      {c.fileUrl && <a href={c.fileUrl} target="_blank" rel="noopener noreferrer">DOC</a>}
                      <button className="danger" onClick={() => remove(c)}>DEL</button>
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
