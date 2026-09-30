import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useScrollLock } from "../../hooks/useScrollLock";
import { AdminIcon } from "./Icon";

/* ── Toasts ─────────────────────────────────────────────── */

interface Toast {
  id: number;
  kind: "success" | "error" | "info";
  title: string;
  desc?: string;
  action?: { label: string; run: () => void };
}

const ToastCtx = createContext<{ push: (t: Omit<Toast, "id">) => void }>({ push: () => undefined });

let toastSeq = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<number, number>());
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);
  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = toastSeq++;
    setToasts((prev) => {
      const expired = prev.slice(0, Math.max(0, prev.length - 2));
      expired.forEach((toast) => {
        const timer = timers.current.get(toast.id);
        if (timer !== undefined) window.clearTimeout(timer);
        timers.current.delete(toast.id);
      });
      return [...prev.slice(-2), { ...t, id }];
    });
    timers.current.set(id, window.setTimeout(() => dismiss(id), 5200));
  }, [dismiss]);
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
            {t.action && <button className="ctl-toast-action" onClick={() => { t.action?.run(); dismiss(t.id); }}>{t.action.label}</button>}
            <button className="ctl-toast-x" onClick={() => dismiss(t.id)} aria-label="Dismiss notification"><AdminIcon name="close" size={16} /></button>
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
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const close = useCallback(() => closeRef.current(), []);
  const titleId = useId();
  const descriptionId = useId();
  useFocusTrap(ref, open, close);
  useScrollLock(open);

  if (!open) return null;
  return (
    <div className="ctl-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`ctl-dialog${danger ? " ctl-dialog--danger" : ""}${wide ? " ctl-dialog--wide" : ""}`}
      >
        <div className="ctl-dialog-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button className="ctl-icon-btn" onClick={onClose} aria-label="Close dialog"><AdminIcon name="close" /></button>
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
      <div className="ctl-empty-icon"><AdminIcon name="file" size={24} /></div>
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
        <button className="ctl-btn ctl-btn--ghost ctl-btn--sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><AdminIcon name="chevronLeft" size={16} />Previous</button>
        <button className="ctl-btn ctl-btn--ghost ctl-btn--sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next<AdminIcon name="chevronRight" size={16} /></button>
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

/* ── Form kit (accessible, consistent) ─────────────────────── */

let fieldSeq = 1;

export function Field({
  label,
  children,
  hint,
  error,
  required,
  full,
}: {
  label: string;
  children: (id: string) => ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
  full?: boolean;
}) {
  const [id] = useState(() => `ctl-field-${fieldSeq++}`);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-err` : undefined;
  return (
    <div className={`ctl-field${full ? " ctl-field--full" : ""}`}>
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="ctl-req" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {children(id)}
      {hint && !error && (
        <span className="ctl-hint" id={hintId}>
          {hint}
        </span>
      )}
      {error && (
        <span className="ctl-field-error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function SearchInput({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
}) {
  return (
    <span className="ctl-search-wrap">
      <span aria-hidden="true" className="ctl-search-ico">
        <AdminIcon name="search" size={16} />
      </span>
      <input
        className="ctl-input ctl-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        placeholder={placeholder ?? "Search…"}
      />
      {value && (
        <button type="button" className="ctl-search-clear" onClick={() => onChange("")} aria-label="Clear search">
          <AdminIcon name="close" size={16} />
        </button>
      )}
    </span>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  desc,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
  disabled?: boolean;
}) {
  return (
    <div className="ctl-switch-row">
      <span className="ctl-switch-text">
        <b>{label}</b>
        {desc && <span>{desc}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        className={`ctl-switch${checked ? " on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span className="ctl-switch-knob" aria-hidden="true" />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="ctl-segment" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={`ctl-seg-btn${value === o ? " active" : ""}`}
          aria-pressed={value === o}
          onClick={() => onChange(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { id: T; label: string; error?: boolean }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="ctl-tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          tabIndex={value === t.id ? 0 : -1}
          className={`ctl-tab${value === t.id ? " active" : ""}${t.error ? " has-error" : ""}`}
          onClick={() => onChange(t.id)}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const buttons = [...(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role=tab]") ?? [])];
            const current = buttons.indexOf(event.currentTarget);
            const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
            buttons[next]?.focus();
            const nextId = tabs[next]?.id;
            if (nextId) onChange(nextId);
          }}
        >
          {t.label}
          {t.error && (
            <span className="ctl-tab-dot" aria-hidden="true">
              •
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ── Right-side editor drawer ───────────────────────────────── */

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const close = useCallback(() => closeRef.current(), []);
  const titleId = useId();
  const subtitleId = useId();
  useFocusTrap(ref, open, close);
  useScrollLock(open);

  if (!open) return null;
  return (
    <div className="ctl-drawer-root">
      <div className="ctl-drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()} />
      <aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        className={`ctl-editor${wide ? " ctl-editor--wide" : ""}`}
      >
        <header className="ctl-editor-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p id={subtitleId}>{subtitle}</p>}
          </div>
          <button type="button" className="ctl-icon-btn" onClick={onClose} aria-label="Close editor">
            <AdminIcon name="close" />
          </button>
        </header>
        {children && <div className="ctl-editor-body">{children}</div>}
        {footer && <footer className="ctl-editor-foot">{footer}</footer>}
      </aside>
    </div>
  );
}

/* ── Toast actions ──────────────────────────────────────────── */
export function useRichToast() {
  const { push } = useToast();
  return useMemo(
    () => ({
      push,
      pushUndo(title: string, desc: string | undefined, onUndo: () => void) {
        push({ kind: "success", title, desc, action: { label: "Undo", run: onUndo } });
      },
    }),
    [push],
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
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const close = useCallback(() => closeRef.current(), []);
  const titleId = useId();

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
    setQuery("");
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      window.clearTimeout(t);
    };
  }, [open]);

  useFocusTrap(listRef, open, close);
  useScrollLock(open);

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
      <div ref={listRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="ctl-palette">
        <div className="ctl-palette-inputrow">
          <span aria-hidden="true"><AdminIcon name="search" size={18} /></span>
          <span id={titleId} className="sr-only">Command palette</span>
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
            aria-activedescendant={filtered[active] ? `ctl-command-${filtered[active]!.id}` : undefined}
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
                  id={`ctl-command-${c.id}`}
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
