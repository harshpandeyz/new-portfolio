import { useState, type ReactNode } from "react";

export function Field({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <div className={`field${full ? " full" : ""}`} style={full ? { gridColumn: "1 / -1" } : undefined}>
      <label>{label}</label>
      {children}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="textarea" {...props} />;
}

export function Select({ options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return (
    <select className="select" {...props}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function ArrayInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...value, v]);
    setDraft("");
  };
  return (
    <div className="array-input">
      {value.map((item, i) => (
        <div className="array-row" key={i}>
          <input className="input" value={item} onChange={(e) => onChange(value.map((x, xi) => (xi === i ? e.target.value : x)))} />
          <button type="button" className="btn btn-sm btn-danger" onClick={() => onChange(value.filter((_, xi) => xi !== i))}>✕</button>
        </div>
      ))}
      <div className="array-row">
        <input
          className="input"
          value={draft}
          placeholder={placeholder ?? "Add item and press Enter"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn btn-sm" onClick={add}>+ ADD</button>
      </div>
    </div>
  );
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="private-error" role="alert" style={{ marginTop: 10 }}>
      ⛔ {error}
    </div>
  );
}
