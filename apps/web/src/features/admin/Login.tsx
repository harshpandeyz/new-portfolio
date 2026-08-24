import { useState } from "react";

import { api } from "../../lib/api";

interface LoginProps {
  onSuccess: (user: { email: string; role: string; displayName: string | null }) => void;
}

export function Login({ onSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.login(email, password);
      onSuccess({ email: r.user.email, role: r.user.role, displayName: null });
    } catch (err) {
      setAttempts((a) => a + 1);
      setError(err instanceof Error ? err.message : "Access denied");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="private-lock" aria-hidden="true">⚿</div>
        <h1 style={{ fontSize: 26, marginTop: 14 }}>HARSH // CONTROL</h1>
        <p className="sub" style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 8 }}>
          Operator authentication. All sessions are HTTP-only, rate-limited and audit-logged.
        </p>
        <form className="private-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="ad-email">OPERATOR ID</label>
            <input id="ad-email" className="input" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ad-password">PASSPHRASE</label>
            <input id="ad-password" className="input" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="private-error" role="alert">⛔ {error}{attempts >= 3 ? " — account lockout protection active." : ""}</div>}
          <button className="btn btn-solid" type="submit" disabled={busy}>
            {busy ? "VERIFYING…" : "AUTHENTICATE"}
          </button>
        </form>
        <p className="private-note" style={{ marginTop: 20, fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--faint)", letterSpacing: "0.1em", lineHeight: 1.8 }}>
          FAILED ATTEMPTS ARE LOGGED WITH IP + TIMESTAMP.
          <br />
          DISCOVERY ≠ ACCESS — EVERY ENDPOINT RE-AUTHORIZATES SERVER-SIDE.
        </p>
      </div>
    </div>
  );
}
