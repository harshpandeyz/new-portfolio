import { useCallback, useEffect, useState } from "react";

import { api } from "../../lib/api";
import type { Skill } from "@hp/shared";
import { ArrayInput, ErrorNote, Field, Select, TextArea, TextInput } from "./fields";

const EMPTY: Partial<Skill> = {
  name: "", category: "LANGUAGES", level: "working", description: "",
  usedIn: [], relatedConcepts: [], featured: false, order: 99,
};

export function SkillsAdmin() {
  const [items, setItems] = useState<Skill[]>([]);
  const [editing, setEditing] = useState<Partial<Skill> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.admin.skills().then((r) => setItems(r.skills)).catch((e) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      if (editing.id) await api.admin.updateSkill(editing.id, editing);
      else await api.admin.createSkill(editing);
      setEditing(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s: Skill) => {
    if (!window.confirm(`Delete skill "${s.name}"?`)) return;
    await api.admin.deleteSkill(s.id).catch((e) => setError(e.message));
    load();
  };

  return (
    <>
      <div className="admin-head">
        <h1>Skills ({items.length})</h1>
        <div className="actions">
          <button className="btn btn-sm btn-solid" onClick={() => setEditing({ ...EMPTY })}>+ NEW SKILL</button>
        </div>
      </div>
      <ErrorNote error={error} />

      {editing ? (
        <div className="editor-panel">
          <div className="editor-section">
            <h3>CAPABILITY MODULE</h3>
            <div className="editor-grid">
              <Field label="NAME"><TextInput value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Field label="CATEGORY">
                <Select value={editing.category ?? "LANGUAGES"} onChange={(e) => setEditing({ ...editing, category: e.target.value as Skill["category"] })}
                  options={["LANGUAGES", "FRONTEND", "BACKEND", "DATABASES", "AI_ML", "CLOUD_DEVOPS", "SECURITY", "MOBILE", "BLOCKCHAIN", "EXPERIMENTAL"].map((c) => ({ value: c, label: c.replace("_", " / ") }))} />
              </Field>
              <Field label="LEVEL (honest!)">
                <Select value={editing.level ?? "working"} onChange={(e) => setEditing({ ...editing, level: e.target.value as Skill["level"] })}
                  options={[
                    { value: "core", label: "CORE — daily driver" },
                    { value: "working", label: "WORKING knowledge" },
                    { value: "exploring", label: "ACTIVELY EXPLORING" },
                    { value: "experimental", label: "EXPERIMENTAL" },
                  ]} />
              </Field>
              <Field label="ORDER"><TextInput type="number" value={String(editing.order ?? 99)} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} /></Field>
              <Field label="DESCRIPTION" full><TextArea rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
              <Field label="USED IN (projects/systems)" full><ArrayInput value={editing.usedIn ?? []} onChange={(v) => setEditing({ ...editing, usedIn: v })} /></Field>
              <Field label="RELATED CONCEPTS" full><ArrayInput value={editing.relatedConcepts ?? []} onChange={(v) => setEditing({ ...editing, relatedConcepts: v })} /></Field>
              <Field label="FLAGS" full>
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
            <thead><tr><th>NAME</th><th>CATEGORY</th><th>LEVEL</th><th>USED IN</th><th></th></tr></thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td><span className="title">{s.name}</span>{s.featured && <span style={{ color: "var(--warn)", marginLeft: 6 }}>★</span>}</td>
                  <td>{s.category.replace("_", " / ")}</td>
                  <td><span style={{ color: s.level === "core" ? "var(--accent)" : s.level === "working" ? "var(--cyan)" : s.level === "exploring" ? "var(--ok)" : "var(--warn)" }}>{s.level}</span></td>
                  <td style={{ fontSize: 11.5 }}>{s.usedIn.join(", ") || "—"}</td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => setEditing(s)}>EDIT</button>
                      <button className="danger" onClick={() => remove(s)}>DEL</button>
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
