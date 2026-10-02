import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../../lib/api";
import { unlock } from "../../lib/achievements";
import { useDialogLifecycle } from "../../hooks/useDialogLifecycle";
import { isEditableTarget } from "../../hooks/useKeyboardShortcut";

interface PrivateAccessProps {
  open: boolean;
  onClose: () => void;
}

export function PrivateAccess({ open, onClose }: PrivateAccessProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useDialogLifecycle(modalRef, open, onClose);
  useEffect(() => {
    if (!open) {
      setPassword("");
      setChallenge(null);
      setCode("");
      return;
    }
    setError(null);
    setChallenge(null);
    setCode("");
  }, [open]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (challenge) {
        await api.login2fa(challenge, code.trim());
        unlock("operator");
        onClose();
        navigate("/private");
        return;
      }
      const res = await api.login(email, password);
      if (res.requires2FA && res.challenge) {
        setPassword("");
        setChallenge(res.challenge);
        window.setTimeout(() => document.getElementById("pa-code")?.focus(), 40);
        return;
      }
      unlock("operator");
      onClose();
      navigate("/private");
    } catch (err) {
      setError("Access denied. Check your credentials and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div ref={modalRef} className="private-modal" role="dialog" aria-modal="true" aria-label="Private access" onClick={(e) => e.stopPropagation()}>
        <div className="private-lock" aria-hidden="true">⚿</div>
        <h3>Private access</h3>
        <p className="sub">Sign in to manage portfolio content.</p>
        <form className="private-form" onSubmit={submit}>
          {!challenge ? (
            <>
              <div className="field">
                <label htmlFor="pa-email">Email</label>
                <input id="pa-email" className="input" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="pa-password">Password</label>
                <input id="pa-password" className="input" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </>
          ) : (
            <div className="field">
              <label htmlFor="pa-code">Two-factor code</label>
              <input id="pa-code" className="input" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code or recovery code" />
              <p className="sub">Two-factor authentication is enabled. Enter your authenticator code.</p>
            </div>
          )}
          {error && <div className="private-error" role="alert">{error}</div>}
          <button className="btn btn-solid" type="submit" disabled={busy}>
            {busy ? "Signing in…" : challenge ? "Verify" : "Sign in"}
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
      if (e.defaultPrevented) return;
      const target = e.target instanceof Element ? e.target : null;
      if (isEditableTarget(e.target) || target?.closest("[role='dialog'], [role='alertdialog']")) return;
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
