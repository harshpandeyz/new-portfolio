import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/* ── Toasts ─────────────────────────────────────────────── */

interface Toast {
  id: number;
  kind: "success" | "error" | "info";
  title: string;
  desc?: string;
}

const ToastCtx = createContext<{ push: (t: Omit<Toast, "id">) => void }>({ push: () => undefined });

let toastSeq = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = toastSeq++;
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="ctl-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`ctl-toast ctl-toast--${t.kind}`}>
            <span className="ctl-toast-dot" aria-hidden="true" />
            <div>
              <div className="ctl-toast-title">{t.title}</div>
              {t.desc && <div className="ctl-toast-desc">{t.desc}</div>}
            </div>
            <button className="ctl-toast-x" onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))} aria-label="Dismiss notification">×</button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

/* ── Dialog ─────────────────────────────────────────────── */

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  danger,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  actions?: ReactNode;
  danger?: boolean;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    const el = ref.current;
    el?.querySelector<HTMLElement>("button, input, select, textarea, [tabindex]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && el) {
        const items = [...el.querySelectorAll<HTMLElement>("button:not([disabled]), input, select, textarea, a[href]")].filter(
          (n) => n.offsetParent !== null,
        );
        if (items.length === 0) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prevFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="ctl-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`ctl-dialog${danger ? " ctl-dialog--danger" : ""}${wide ? " ctl-dialog--wide" : ""}`}
      >
        <div className="ctl-dialog-head">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="ctl-icon-btn" onClick={onClose} aria-label="Close dialog">×</button>
        </div>
        {children && <div className="ctl-dialog-body">{children}</div>}
        {actions && <div className="ctl-dialog-foot">{actions}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  busy?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      danger
      actions={
        <>
          <button className="ctl-btn ctl-btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="ctl-btn ctl-btn--danger" onClick={() => void onConfirm()} disabled={busy} autoFocus>
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    />
  );
}

/* ── States ─────────────────────────────────────────────── */

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="ctl-skeleton" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <span key={i} style={{ width: `${92 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="ctl-card ctl-skeleton-card" aria-label="Loading">
      <span className="ctl-skel-line ctl-skel-line--w40" />
      <span className="ctl-skel-line" />
      <span className="ctl-skel-line ctl-skel-line--w70" />
    </div>
  );
}

export function EmptyState({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="ctl-empty">
      <div className="ctl-empty-icon" aria-hidden="true">○</div>
      <h3>{title}</h3>
      {desc && <p>{desc}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="ctl-error" role="alert">
      <strong>Something went wrong</strong>
      <p>{message}</p>
      {onRetry && (
        <button className="ctl-btn ctl-btn--secondary" onClick={onRetry}>Try again</button>
      )}
    </div>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "blue" | "green" | "amber" | "red" | "gray"; children: ReactNode }) {
  return <span className={`ctl-badge ctl-badge--${tone}`}>{children}</span>;
}

export function PageHead({
  title,
  desc,
  actions,
  crumbs,
}: {
  title: string;
  desc?: string;
  actions?: ReactNode;
  crumbs?: { label: string; href?: string }[];
}) {
  return (
    <div className="ctl-pagehead">
      <div>
        {crumbs && crumbs.length > 0 && (
          <nav className="ctl-crumbs" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={i}>
                {i > 0 && <span className="ctl-crumb-sep">/</span>}
                {c.href ? <a href={c.href}>{c.label}</a> : <span aria-current="page">{c.label}</span>}
              </span>
            ))}
          </nav>
        )}
        <h1>{title}</h1>
        {desc && <p>{desc}</p>}
      </div>
      {actions && <div className="ctl-pagehead-actions">{actions}</div>}
    </div>
  );
}

export function Pagination({
  page,
  pages,
  total,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  return (
    <div className="ctl-pagination">
      <span className="ctl-pagination-info">Page {page} of {pages} · {total} total</span>
      <div className="ctl-pagination-btns">
        <button className="ctl-btn ctl-btn--ghost ctl-btn--sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
        <button className="ctl-btn ctl-btn--ghost ctl-btn--sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next →</button>
      </div>
    </div>
  );
}

export function friendlyError(e: unknown, fallback = "Request failed. Please try again."): string {
  if (e instanceof Error) {
    const msg = e.message;
    // Never surface backend internals; map to clean messages.
    if (/prisma|sql|ECONN|ENOTFOUND|stack/i.test(msg)) return fallback;
    if (msg.length > 220) return fallback;
    return msg;
  }
  return fallback;
}

/* ── Persistent UI state (filters/search survive navigation) ─── */

export function usePersistentState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {
      /* corrupted or unavailable storage — fall back to default */
    }
    return initial;
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full/blocked — state simply won't persist */
    }
  }, [key, value]);
  return [value, setValue];
}

/* ── Relative timestamps ────────────────────────────────────── */

export function formatTimeAgo(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "unknown";
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/* ── Automated-test message detection ─────────────────────────
   E2E runs must never pollute the production inbox silently.
   Test submissions are tagged `[E2E]` (see e2e/experience.spec.ts);
   this matches them for the "hide tests" filter. */

export function isTestMessage(m: { name: string; email: string; subject: string | null; message: string }): boolean {
  return (
    /\[e2e\]/i.test(m.subject ?? "") ||
    /^e2e-/i.test(m.email) ||
    /automated end-to-end test/i.test(m.message) ||
    /^e2e\s/i.test(m.name)
  );
}

/* ── Skeleton list ──────────────────────────────────────────── */

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="ctl-skeleton-list" aria-label="Loading" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="ctl-skeleton-row" key={i}>
          <span className="ctl-skel-line ctl-skel-line--w40" />
          <span className="ctl-skel-line ctl-skel-line--w70" />
        </div>
      ))}
    </div>
  );
}

/* ── Command palette ────────────────────────────────────────── */

export interface PaletteCommand {
  id: string;
  label: string;
  hint?: string;
  group: string;
  keywords?: string;
  disabled?: boolean;
  disabledReason?: string;
  action: () => void;
}

export function CommandPalette({
  open,
  onClose,
  commands,
}: {
  open: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? commands.filter(
          (c) => c.label.toLowerCase().includes(q) || (c.keywords ?? "").toLowerCase().includes(q) || c.group.toLowerCase().includes(q),
        )
      : commands;
    return list.filter((c) => !c.disabled);
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    setQuery("");
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = "";
      prevFocus.current?.focus?.();
    };
  }, [open, onClose]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const run = (c: PaletteCommand) => {
    onClose();
    // Let the palette unmount before navigating/focusing elsewhere.
    window.setTimeout(() => c.action(), 30);
  };

  let lastGroup = "";
  return (
    <div className="ctl-palette-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={listRef} role="dialog" aria-modal="true" aria-label="Command palette" className="ctl-palette">
        <div className="ctl-palette-inputrow">
          <span aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            className="ctl-palette-input"
            placeholder="Type a command or search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && filtered[active]) {
                e.preventDefault();
                run(filtered[active]!);
              }
            }}
            aria-label="Command search"
            aria-expanded="true"
            aria-controls="ctl-palette-list"
            role="combobox"
            aria-autocomplete="list"
          />
          <kbd>esc</kbd>
        </div>
        <div id="ctl-palette-list" role="listbox" className="ctl-palette-list">
          {filtered.length === 0 && (
            <div className="ctl-palette-empty">No results for “{query}”.</div>
          )}
          {filtered.map((c, i) => {
            const header = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            return (
              <div key={c.id}>
                {header && <div className="ctl-palette-group">{header}</div>}
                <button
                  role="option"
                  aria-selected={i === active}
                  data-active={i === active}
                  className={`ctl-palette-item${i === active ? " active" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(c)}
                >
                  <span>{c.label}</span>
                  {c.hint && <kbd>{c.hint}</kbd>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
