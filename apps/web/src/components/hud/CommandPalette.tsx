import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: string;
  action: () => void;
  keywords?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}

export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || (c.keywords ?? "").toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setQuery("");
      setActive(0);
      window.setTimeout(() => inputRef.current?.focus(), 30);
      document.body.classList.add("no-scroll");
    } else {
      document.body.classList.remove("no-scroll");
      window.setTimeout(() => previousFocusRef.current?.focus(), 0);
    }
    return () => document.body.classList.remove("no-scroll");
  }, [open]);

  const run = useCallback(
    (index: number) => {
      const cmd = filtered[index];
      if (!cmd) return;
      onClose();
      window.setTimeout(() => cmd.action(), 60);
    },
    [filtered, onClose],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), a[href]");
        if (!focusables?.length) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(filtered.length - 1, a + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        run(active);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, active, run, onClose]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Command palette" onClick={onClose} onKeyDown={() => undefined}>
      <div ref={dialogRef} className="palette" onClick={(e) => e.stopPropagation()} role="document">
        <div className="palette-input-row">
          <span className="prompt">❯</span>
          <input
            ref={inputRef}
            className="palette-input"
            placeholder="Type a command or search…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            aria-label="Search commands"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--faint)", border: "1px solid var(--line)", borderRadius: 4, padding: "2px 6px" }}>ESC</kbd>
        </div>
        <div className="palette-list" ref={listRef} role="listbox">
          {filtered.length === 0 && <div className="palette-empty">NO MATCHING COMMANDS</div>}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              className={`palette-item${i === active ? " active" : ""}`}
              data-idx={i}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => run(i)}
            >
              <span className="pi-icon">{cmd.icon}</span>
              <span className="pi-label">{cmd.label}</span>
              {cmd.hint && <span className="pi-hint">{cmd.hint}</span>}
            </button>
          ))}
        </div>
        <div className="palette-foot">
          <span>↑↓ NAVIGATE</span>
          <span>↵ EXECUTE</span>
          <span style={{ marginLeft: "auto" }}>HP//OS COMMAND INTERFACE</span>
        </div>
      </div>
    </div>
  );
}
