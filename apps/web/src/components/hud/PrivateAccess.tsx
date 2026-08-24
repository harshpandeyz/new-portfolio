import { useEffect, useState } from "react";
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
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setError(null);
      window.setTimeout(() => document.getElementById("pa-email")?.focus(), 40);
    }
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
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Private system access" onClick={onClose}>
      <div className="private-modal" onClick={(e) => e.stopPropagation()}>
        <div className="private-lock" aria-hidden="true">⚿</div>
        <h3>PRIVATE SYSTEM</h3>
        <p className="sub">Operator authentication required. This console manages the live portfolio.</p>
        <form className="private-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="pa-email">OPERATOR ID</label>
            <input id="pa-email" className="input" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pa-password">PASSPHRASE</label>
            <input id="pa-password" className="input" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="private-error" role="alert">⛔ {error}</div>}
          <button className="btn btn-solid" type="submit" disabled={busy}>
            {busy ? "VERIFYING…" : "AUTHENTICATE"}
          </button>
        </form>
        <p className="private-note">
          SESSIONS ARE HTTP-ONLY · RATE-LIMITED · AUDIT-LOGGED
          <br />
          DISCOVERY ≠ ACCESS — EVERY REQUEST IS VERIFIED SERVER-SIDE
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
