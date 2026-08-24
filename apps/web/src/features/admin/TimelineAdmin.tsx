import { useCallback, useEffect, useState } from "react";

import { api } from "../../lib/api";
import type { TimelineItem } from "@hp/shared";
import { ErrorNote, Field, Select, TextArea, TextInput } from "./fields";

const EMPTY: Partial<TimelineItem> = {
  date: "", endDate: "", title: "", organization: "", description: "",
  type: "milestone", order: 99,
};

export function TimelineAdmin() {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [editing, setEditing] = useState<Partial<TimelineItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.admin.timeline().then((r) => setItems(r.items)).catch((e) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const payload = { ...editing, endDate: editing.endDate || null, organization: editing.organization || null };
      if (editing.id) await api.admin.updateTimeline(editing.id, payload);
      else await api.admin.createTimeline(payload);
      setEditing(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (t: TimelineItem) => {
    if (!window.confirm(`Delete "${t.title}"?`)) return;
    await api.admin.deleteTimeline(t.id).catch((e) => setError(e.message));
    load();
  };

  return (
    <>
      <div className="admin-head">
        <h1>Timeline ({items.length})</h1>
        <div className="actions">
          <button className="btn btn-sm btn-solid" onClick={() => setEditing({ ...EMPTY })}>+ NEW ENTRY</button>
        </div>
      </div>
      <ErrorNote error={error} />

      {editing ? (
        <div className="editor-panel">
          <div className="editor-section">
            <h3>MISSION LOG ENTRY</h3>
            <div className="editor-grid">
              <Field label="DATE (e.g. 2024-09 or 2025-06-02)"><TextInput value={editing.date ?? ""} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></Field>
              <Field label="END DATE (optional)"><TextInput value={editing.endDate ?? ""} onChange={(e) => setEditing({ ...editing, endDate: e.target.value })} /></Field>
              <Field label="TITLE" full><TextInput value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
              <Field label="ORGANIZATION"><TextInput value={editing.organization ?? ""} onChange={(e) => setEditing({ ...editing, organization: e.target.value })} /></Field>
              <Field label="TYPE">
                <Select value={editing.type ?? "milestone"} onChange={(e) => setEditing({ ...editing, type: e.target.value as TimelineItem["type"] })}
                  options={["education", "project", "certification", "experience", "competition", "milestone"].map((t) => ({ value: t, label: t.toUpperCase() }))} />
              </Field>
              <Field label="DESCRIPTION" full><TextArea rows={3} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
              <Field label="ORDER"><TextInput type="number" value={String(editing.order ?? 99)} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} /></Field>
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
            <thead><tr><th>DATE</th><th>TITLE</th><th>TYPE</th><th>ORG</th><th></th></tr></thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{t.date}{t.endDate ? `–${t.endDate}` : ""}</td>
                  <td><span className="title">{t.title}</span></td>
                  <td>{t.type}</td>
                  <td>{t.organization ?? "—"}</td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => setEditing(t)}>EDIT</button>
                      <button className="danger" onClick={() => remove(t)}>DEL</button>
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
