import { useState } from "react";

import { api, ApiError } from "../../lib/api";

interface LoginProps {
  onSuccess: (user: { email: string; role: string; displayName: string | null; totpEnabled: boolean }) => void;
}

export function Login({ onSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.login(email.trim(), password);
      if (r.requires2FA && r.challenge) {
        setChallenge(r.challenge);
        setCode("");
        return;
      }
      const me = await api.me().catch(() => null);
      onSuccess({
        email: r.user?.email ?? email.trim().toLowerCase(),
        role: r.user?.role ?? "ADMIN",
        displayName: null,
        totpEnabled: me?.user.totpEnabled ?? r.user?.totpEnabled ?? false,
      });
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429 ? err.message : "Invalid email or password.");
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.login2fa(challenge, code.trim());
      const me = await api.me().catch(() => null);
      onSuccess({
        email: r.user.email,
        role: r.user.role,
        displayName: null,
        totpEnabled: me?.user.totpEnabled ?? true,
      });
    } catch {
      setError("Invalid code. Try again or use a recovery code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ctl-login-wrap">
      <div className="ctl-login-card">
        <div className="ctl-brand-mark" aria-hidden="true">H</div>
        <h1>Harsh // Control</h1>
        <p className="sub">
          {challenge ? "Two-factor verification required." : "Sign in to manage your portfolio. Sessions are private and audit-logged."}
        </p>
        {!challenge ? (
          <form onSubmit={submitPassword} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
            <div className="ctl-field">
              <label htmlFor="ctl-email">Email</label>
              <input id="ctl-email" className="ctl-input" type="email" required autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="ctl-field">
              <label htmlFor="ctl-password">Password</label>
              <input id="ctl-password" className="ctl-input" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" />
            </div>
            {error && <div className="ctl-alert" role="alert">{error}</div>}
            <button className="ctl-btn ctl-btn--primary" type="submit" disabled={busy} style={{ justifyContent: "center" }}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <p style={{ fontSize: 12, color: "#8a93a3" }}>Failed attempts are rate-limited and logged. No account hints are revealed.</p>
          </form>
        ) : (
          <form onSubmit={submitCode} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
            <div className="ctl-field">
              <label htmlFor="ctl-code">6-digit code or recovery code</label>
              <input id="ctl-code" className="ctl-input" inputMode="text" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="123 456 or XXXXX-XXXXX" autoFocus />
            </div>
            {error && <div className="ctl-alert" role="alert">{error}</div>}
            <button className="ctl-btn ctl-btn--primary" type="submit" disabled={busy} style={{ justifyContent: "center" }}>
              {busy ? "Verifying…" : "Verify"}
            </button>
            <button type="button" className="ctl-btn ctl-btn--ghost" onClick={() => { setChallenge(null); setCode(""); setError(null); }} style={{ justifyContent: "center" }}>
              Back to password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
