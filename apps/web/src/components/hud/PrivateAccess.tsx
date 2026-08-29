import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../../lib/api";
import { unlock } from "../../lib/achievements";

interface PrivateAccessProps {
  open: boolean;
  onClose: () => void;
}

export function PrivateAccess({ open, onClose }: PrivateAccessProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    setError(null);
    document.body.classList.add("no-scroll");
    window.setTimeout(() => document.getElementById("pa-email")?.focus(), 40);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = modalRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), a[href]");
      if (!focusables?.length) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("no-scroll");
      window.removeEventListener("keydown", onKeyDown);
      window.setTimeout(() => previousFocusRef.current?.focus(), 0);
    };
    // The modal lifecycle is controlled by the parent route shell.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(email, password);
      unlock("operator");
      onClose();
      navigate("/private");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Access denied");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Private access" onClick={onClose}>
      <div ref={modalRef} className="private-modal" onClick={(e) => e.stopPropagation()}>
        <div className="private-lock" aria-hidden="true">⚿</div>
        <h3>Private access</h3>
        <p className="sub">Sign in to manage portfolio content.</p>
        <form className="private-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="pa-email">Email</label>
            <input id="pa-email" className="input" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pa-password">Password</label>
            <input id="pa-password" className="input" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="private-error" role="alert">⛔ {error}</div>}
          <button className="btn btn-solid" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="private-note">
          Sessions are protected and every request is verified server-side.
        </p>
      </div>
    </div>
  );
}

/** Global keyboard shortcuts: ⌘K palette, Ctrl+Shift+H private access. */
export function useGlobalShortcuts(opts: { onPalette: () => void; onPrivate: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        opts.onPalette();
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        opts.onPrivate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opts]);
}
