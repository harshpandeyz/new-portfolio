/**
 * Legacy field helpers — kept as thin wrappers over the accessible `ui` kit
 * so older imports keep working. New code should import from `./ui` directly.
 */
import type { ReactNode } from "react";

import { Field as UiField } from "./ui";

export function Field({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <UiField label={label} full={full}>
      {() => <>{children}</>}
    </UiField>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="ctl-input" {...props} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="ctl-textarea" {...props} />;
}

export function Select({ options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return (
    <select className="ctl-select" {...props}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function ArrayInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const add = (draft: string, setDraft: (v: string) => void) => {
    const v = draft.trim();
    if (!v) return;
    onChange([...value, v]);
    setDraft("");
  };
  return (
    <div className="array-input">
      {value.map((item, i) => (
        <div className="array-row" key={`${item}-${i}`}>
          <input
            className="ctl-input"
            value={item}
            aria-label={`Item ${i + 1}`}
            onChange={(e) => onChange(value.map((x, xi) => (xi === i ? e.target.value : x)))}
          />
          <button type="button" className="ctl-mini-btn danger" aria-label={`Remove item ${i + 1}`} onClick={() => onChange(value.filter((_, xi) => xi !== i))}>×</button>
        </div>
      ))}
      <DraftRow placeholder={placeholder} onAdd={add} />
    </div>
  );
}

import { useState } from "react";

function DraftRow({ placeholder, onAdd }: { placeholder?: string; onAdd: (draft: string, setDraft: (v: string) => void) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <div className="array-row">
      <input
        className="ctl-input"
        value={draft}
        placeholder={placeholder ?? "Add item and press Enter"}
        aria-label="New item"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAdd(draft, setDraft);
          }
        }}
      />
      <button type="button" className="ctl-btn ctl-btn--secondary ctl-btn--sm" onClick={() => onAdd(draft, setDraft)}>Add</button>
    </div>
  );
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="ctl-alert" role="alert" style={{ marginTop: 10 }}>
      {error}
    </div>
  );
}
