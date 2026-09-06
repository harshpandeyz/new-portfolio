import { useCallback, useEffect, useState } from "react";

import { api } from "../../lib/api";
import { Badge, ConfirmDialog, Dialog, EmptyState, ErrorState, PageHead, friendlyError, useToast } from "./ui";

interface Overview {
  email: string;
  role: string;
  displayName: string | null;
  passwordChangedAt: string | null;
  totpEnabled: boolean;
  totpEnabledAt: string | null;
  recoveryCodesRemaining: number;
  activeSessions: number;
  lastLoginAt: string | null;
}

interface Session {
  id: string;
  current: boolean;
  ip: string | null;
  userAgent: string | null;
  device: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revoked: boolean;
}

export function SecurityCenter({ onSessionChange }: { onSessionChange: () => void }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [events, setEvents] = useState<{ id: string; action: string; actor: string; createdAt: string; ip: string | null }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  // password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  // reauth
  const [reauthPw, setReauthPw] = useState("");
  const [reauthCode, setReauthCode] = useState("");
  const [reauthBusy, setReauthBusy] = useState(false);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // 2fa
  const [setup, setSetup] = useState<{ secret: string; qrDataUrl: string | null; otpauthUrl: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [busy2fa, setBusy2fa] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, s, e] = await Promise.all([api.securityOverview(), api.sessions(), api.admin.securityEvents()]);
      setOverview(o);
      setSessions(s.sessions);
      setEvents(e.logs);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const needReauth = (fn: () => void) => {
    setPendingAction(() => fn);
    setReauthOpen(true);
  };

  const doReauth = async (e: React.FormEvent) => {
    e.preventDefault();
    setReauthBusy(true);
    try {
      await api.reauth(reauthPw, overview?.totpEnabled ? reauthCode || undefined : undefined);
      push({ kind: "success", title: "Verified", desc: "You can now perform sensitive actions for ~10 minutes." });
      setReauthOpen(false);
      setReauthPw("");
      setReauthCode("");
      // refresh session freshness then run pending
      await load();
      pendingAction?.();
      setPendingAction(null);
    } catch (err) {
      push({ kind: "error", title: "Verification failed", desc: friendlyError(err) });
    } finally {
      setReauthBusy(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwBusy(true);
    try {
      await api.changePassword(currentPw, newPw);
      push({ kind: "success", title: "Password changed", desc: "Other sessions were revoked." });
      setCurrentPw("");
      setNewPw("");
      void load();
      onSessionChange();
    } catch (err) {
      push({ kind: "error", title: "Password change failed", desc: friendlyError(err) });
    } finally {
      setPwBusy(false);
    }
  };

  const startSetup = async () => {
    setBusy2fa(true);
    try {
      const r = await api.twofaSetup();
      setSetup(r);
    } catch (e) {
      push({ kind: "error", title: "2FA setup failed", desc: friendlyError(e) });
    } finally {
      setBusy2fa(false);
    }
  };

  const confirmEnable = async () => {
    if (!setup) return;
    setBusy2fa(true);
    try {
      const r = await api.twofaEnable(verifyCode.trim());
      setRecoveryCodes(r.recoveryCodes);
      setSetup(null);
      setVerifyCode("");
      push({ kind: "success", title: "2FA enabled" });
      void load();
    } catch (e) {
      push({ kind: "error", title: "Invalid code", desc: friendlyError(e) });
    } finally {
      setBusy2fa(false);
    }
  };

  const disable2fa = async () => {
    setBusy2fa(true);
    try {
      await api.twofaDisable();
      setConfirmDisable(false);
      push({ kind: "success", title: "2FA disabled" });
      void load();
    } catch (e) {
      const msg = friendlyError(e);
      if (/Recent authentication/i.test(msg)) {
        setConfirmDisable(false);
        needReauth(() => setConfirmDisable(true));
      } else {
        push({ kind: "error", title: "Disable failed", desc: msg });
      }
    } finally {
      setBusy2fa(false);
    }
  };

  const regenCodes = async () => {
    setBusy2fa(true);
    try {
      const r = await api.twofaRegenCodes();
      setRecoveryCodes(r.recoveryCodes);
      push({ kind: "success", title: "New recovery codes issued", desc: "Old codes no longer work." });
      void load();
    } catch (e) {
      const msg = friendlyError(e);
      if (/Recent authentication/i.test(msg)) needReauth(() => void regenCodes());
      else push({ kind: "error", title: "Regeneration failed", desc: msg });
    } finally {
      setBusy2fa(false);
    }
  };

  const revokeSession = async (id: string, current: boolean) => {
    try {
      await api.revokeSession(id);
      push({ kind: "success", title: current ? "Signed out" : "Session revoked" });
      if (current) window.location.reload();
      else void load();
    } catch (e) {
      push({ kind: "error", title: "Revoke failed", desc: friendlyError(e) });
    }
  };

  const revokeOthers = async () => {
    try {
      await api.revokeOtherSessions();
      push({ kind: "success", title: "Other sessions revoked" });
      void load();
    } catch (e) {
      push({ kind: "error", title: "Revoke failed", desc: friendlyError(e) });
    }
  };

  const revokeAll = async () => {
    try {
      await api.revokeAllSessions();
      window.location.reload();
    } catch (e) {
      const msg = friendlyError(e);
      if (/Recent authentication/i.test(msg)) {
        setConfirmRevokeAll(false);
        needReauth(() => setConfirmRevokeAll(true));
      } else {
        push({ kind: "error", title: "Revoke failed", desc: msg });
      }
    }
  };

  if (loading) return (<><PageHead title="Security" desc="Authentication, sessions, and recent security events." /><p style={{ color: "#8a93a3" }}>Loading security state…</p></>);
  if (error || !overview) return (<><PageHead title="Security" desc="Authentication, sessions, and recent security events." /><ErrorState message={error ?? "Failed to load"} onRetry={() => void load()} /></>);

  return (
    <>
      <PageHead title="Security" desc="Real account state from the server. No scores, no guesses." />

      <div className="ctl-sec-grid">
        <div className="ctl-card">
          <h3>AUTHENTICATION</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13.5 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Signed in as</span><b>{overview.email}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Role</span><Badge tone="blue">{overview.role}</Badge></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Password last changed</span><b>{overview.passwordChangedAt ? new Date(overview.passwordChangedAt).toLocaleString() : "Never recorded"}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>Two-factor</span><Badge tone={overview.totpEnabled ? "green" : "amber"}>{overview.totpEnabled ? "ENABLED" : "DISABLED"}</Badge></div>
            {overview.totpEnabled && (
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Recovery codes left</span><b>{overview.recoveryCodesRemaining}</b></div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Last login</span><b>{overview.lastLoginAt ? new Date(overview.lastLoginAt).toLocaleString() : "—"}</b></div>
          </div>
        </div>

        <div className="ctl-card">
          <h3>CHANGE PASSWORD</h3>
          <form onSubmit={changePassword} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="ctl-field"><label htmlFor="sec-cur">Current password</label><input id="sec-cur" className="ctl-input" type="password" autoComplete="current-password" required value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} /></div>
            <div className="ctl-field"><label htmlFor="sec-new">New password (12+ chars, mixed case, number, symbol)</label><input id="sec-new" className="ctl-input" type="password" autoComplete="new-password" required minLength={12} value={newPw} onChange={(e) => setNewPw(e.target.value)} /></div>
            <button className="ctl-btn ctl-btn--primary" disabled={pwBusy} style={{ justifyContent: "center" }}>{pwBusy ? "Changing…" : "Change password"}</button>
            <p style={{ fontSize: 12, color: "#8a93a3" }}>Changing your password revokes all other sessions.</p>
          </form>
        </div>
      </div>

      <div className="ctl-sec-grid" style={{ marginTop: 12 }}>
        <div className="ctl-card">
          <h3>TWO-FACTOR AUTHENTICATION</h3>
          {!overview.totpEnabled ? (
            !setup ? (
              <>
                <p style={{ fontSize: 13.5, color: "#4b5563" }}>Add TOTP (authenticator app) as a second factor. You will enter a 6-digit code after your password.</p>
                <button className="ctl-btn ctl-btn--primary" onClick={() => void startSetup()} disabled={busy2fa} style={{ marginTop: 10 }}>{busy2fa ? "Preparing…" : "Start setup"}</button>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {setup.qrDataUrl && <img src={setup.qrDataUrl} alt="2FA QR code" width={180} height={180} style={{ borderRadius: 12, border: "1px solid #e6e8ee" }} />}
                <div className="ctl-field"><label>Manual entry secret</label><input className="ctl-input" readOnly value={setup.secret} onFocus={(e) => e.target.select()} /></div>
                <div className="ctl-field"><label htmlFor="sec-2fa-code">6-digit code from your app</label><input id="sec-2fa-code" className="ctl-input" inputMode="numeric" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} placeholder="123456" /></div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="ctl-btn ctl-btn--primary" onClick={() => void confirmEnable()} disabled={busy2fa}>Verify & enable</button>
                  <button className="ctl-btn ctl-btn--ghost" onClick={() => setSetup(null)}>Cancel</button>
                </div>
              </div>
            )
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 13.5, color: "#4b5563" }}>Enabled{overview.totpEnabledAt ? ` since ${new Date(overview.totpEnabledAt).toLocaleDateString()}` : ""}.</p>
              <p className="ctl-reauth-note">Disabling 2FA or regenerating codes needs re-verification first.</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="ctl-btn ctl-btn--secondary ctl-btn--sm" onClick={() => void regenCodes()} disabled={busy2fa}>Regenerate recovery codes</button>
                <button className="ctl-btn ctl-btn--danger ctl-btn--sm" onClick={() => setConfirmDisable(true)}>Disable 2FA…</button>
              </div>
            </div>
          )}
          {recoveryCodes && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700 }}>Recovery codes — shown once. Store them safely.</p>
              <div className="ctl-codes" style={{ marginTop: 8 }}>{recoveryCodes.map((c) => (<span key={c}>{c}</span>))}</div>
              <button className="ctl-btn ctl-btn--ghost ctl-btn--sm" style={{ marginTop: 8 }} onClick={() => navigator.clipboard.writeText(recoveryCodes.join("\n")).catch(() => undefined)}>Copy codes</button>
            </div>
          )}
        </div>

        <div className="ctl-card">
          <h3>SECURITY EVENTS</h3>
          {events.length === 0 ? (
            <EmptyState title="No security events yet" desc="Sign-ins, password changes, and 2FA actions will appear here." />
          ) : (
            <div className="ctl-list">
              {events.slice(0, 12).map((l) => (
                <div key={l.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid #f0f2f6", fontSize: 12.5 }}>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: l.action.includes("FAILURE") ? "#c0362c" : "#0a55d6" }}>{l.action}</span>
                  <span style={{ marginLeft: "auto", color: "#8a93a3" }}>{new Date(l.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="ctl-card" style={{ marginTop: 12 }}>
        <h3>SESSIONS ({sessions.length} ACTIVE)</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 4, flexWrap: "wrap", alignItems: "center" }}>
          <button className="ctl-btn ctl-btn--ghost ctl-btn--sm" onClick={() => void revokeOthers()}>Revoke other sessions</button>
          <button className="ctl-btn ctl-btn--danger ctl-btn--sm" onClick={() => setConfirmRevokeAll(true)}>Revoke all sessions…</button>
        </div>
        <p className="ctl-reauth-note" style={{ marginBottom: 8 }}>Revoking all sessions signs you out everywhere and needs re-verification.</p>
        {sessions.length === 0 ? (
          <EmptyState title="No active sessions" desc="You appear to be signed out everywhere." />
        ) : (
          <div>
            {sessions.map((s) => (
              <div className="ctl-session-row" key={s.id}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <b style={{ fontSize: 13 }}>{s.device}</b>
                    {s.current && <Badge tone="green">THIS SESSION</Badge>}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, overflowWrap: "anywhere" }}>
                    {s.ip ?? "unknown IP"} · last active {new Date(s.lastSeenAt).toLocaleString()} · expires {new Date(s.expiresAt).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: 11, color: "#9aa1ad", overflowWrap: "anywhere" }}>{s.userAgent ?? ""}</div>
                </div>
                <button className="ctl-mini-btn danger" onClick={() => void revokeSession(s.id, s.current)}>Revoke</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={reauthOpen} onClose={() => setReauthOpen(false)} title="Confirm it is you" description="Sensitive actions need a fresh verification (valid ~10 minutes).">
        <form onSubmit={doReauth} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="ctl-field"><label htmlFor="reauth-pw">Password</label><input id="reauth-pw" className="ctl-input" type="password" required value={reauthPw} onChange={(e) => setReauthPw(e.target.value)} autoFocus /></div>
          {overview.totpEnabled && (
            <div className="ctl-field"><label htmlFor="reauth-code">2FA code or recovery code</label><input id="reauth-code" className="ctl-input" value={reauthCode} onChange={(e) => setReauthCode(e.target.value)} required /></div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="ctl-btn ctl-btn--ghost" onClick={() => setReauthOpen(false)}>Cancel</button>
            <button type="submit" className="ctl-btn ctl-btn--primary" disabled={reauthBusy}>{reauthBusy ? "Verifying…" : "Verify"}</button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog open={confirmDisable} onClose={() => setConfirmDisable(false)} onConfirm={() => void disable2fa()} title="Disable two-factor authentication?" description="Your account will rely on password alone. This is logged." confirmLabel="Disable 2FA" busy={busy2fa} />
      <ConfirmDialog open={confirmRevokeAll} onClose={() => setConfirmRevokeAll(false)} onConfirm={() => void revokeAll()} title="Revoke all sessions?" description="You will be signed out everywhere, including this device." confirmLabel="Revoke all" busy={false} />
    </>
  );
}
