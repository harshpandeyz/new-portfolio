import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../lib/api";
import { Badge, ConfirmDialog, Dialog, EmptyState, ErrorState, Field, PageHead, friendlyError, useToast } from "./ui";

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

interface SecEvent {
  id: string;
  action: string;
  actor: string;
  createdAt: string;
  ip: string | null;
}

function passwordScore(pw: string): number {
  let s = 0;
  if (pw.length >= 12) s += 1;
  if (pw.length >= 16) s += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 1;
  if (/\d/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) s += 1;
  return Math.min(4, s);
}

const SCORE_LABEL = ["Too weak", "Weak", "Okay", "Strong", "Excellent"];

function Section({
  title,
  action,
  loading,
  error,
  onRetry,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="ctl-card" aria-label={title}>
      <div className="ctl-widget-head">
        <h3>{title}</h3>
        {action}
      </div>
      {loading ? (
        <p style={{ color: "#8a93a3", fontSize: 13 }}>Loading…</p>
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : (
        children
      )}
    </section>
  );
}

export function SecurityCenter({ onSessionChange }: { onSessionChange: () => void }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [events, setEvents] = useState<SecEvent[]>([]);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  // password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // reauth
  const [reauthPw, setReauthPw] = useState("");
  const [reauthCode, setReauthCode] = useState("");
  const [reauthBusy, setReauthBusy] = useState(false);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ label: string; run: () => void } | null>(null);

  // 2fa wizard: 1 scan → 2 verify → 3 codes
  const [setup, setSetup] = useState<{ secret: string; qrDataUrl: string | null; otpauthUrl: string } | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [verifyCode, setVerifyCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [codesSaved, setCodesSaved] = useState(false);
  const [busy2fa, setBusy2fa] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Session | null>(null);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

  const loadOverview = useCallback(async () => {
    setOverviewError(null);
    try {
      setOverview(await api.securityOverview());
    } catch (e) {
      setOverviewError(friendlyError(e));
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setSessionsError(null);
    try {
      const s = await api.sessions();
      setSessions(s.sessions);
    } catch (e) {
      setSessionsError(friendlyError(e));
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setEventsError(null);
    try {
      const e = await api.admin.securityEvents();
      setEvents(e.logs);
    } catch (err) {
      setEventsError(friendlyError(err));
    }
  }, []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    Promise.all([loadOverview(), loadSessions(), loadEvents()]).finally(() => {
      if (live) setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [loadOverview, loadSessions, loadEvents]);

  const needReauth = (label: string, fn: () => void) => {
    setPendingAction({ label, run: fn });
    setReauthOpen(true);
  };

  const doReauth = async (e: React.FormEvent) => {
    e.preventDefault();
    setReauthBusy(true);
    try {
      await api.reauth(reauthPw, overview?.totpEnabled ? reauthCode || undefined : undefined);
      push({ kind: "success", title: "Verified", desc: "Sensitive actions unlocked for ~10 minutes." });
      setReauthOpen(false);
      setReauthPw("");
      setReauthCode("");
      const action = pendingAction;
      setPendingAction(null);
      await Promise.all([loadOverview(), loadSessions()]);
      action?.run();
    } catch (err) {
      push({ kind: "error", title: "Verification failed", desc: friendlyError(err) });
    } finally {
      setReauthBusy(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (newPw !== confirmPw) {
      setPwError("New passwords do not match.");
      return;
    }
    if (newPw.length < 12) {
      setPwError("Use at least 12 characters.");
      return;
    }
    setPwBusy(true);
    try {
      await api.changePassword(currentPw, newPw);
      push({ kind: "success", title: "Password changed", desc: "Other sessions were revoked." });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      void loadOverview();
      void loadSessions();
      onSessionChange();
    } catch (err) {
      setPwError(friendlyError(err));
    } finally {
      setPwBusy(false);
    }
  };

  const startSetup = async () => {
    setBusy2fa(true);
    try {
      const r = await api.twofaSetup();
      setSetup(r);
      setWizardStep(1);
      setVerifyCode("");
      setRecoveryCodes(null);
      setCodesSaved(false);
    } catch (e) {
      const msg = friendlyError(e);
      if (/Recent authentication/i.test(msg)) needReauth("start 2FA setup", () => void startSetup());
      else push({ kind: "error", title: "2FA setup failed", desc: msg });
    } finally {
      setBusy2fa(false);
    }
  };

  const confirmEnable = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!setup || !/^\d{6}$/.test(verifyCode.trim())) {
      push({ kind: "error", title: "Enter the 6-digit code" });
      return;
    }
    setBusy2fa(true);
    try {
      const r = await api.twofaEnable(verifyCode.trim());
      setRecoveryCodes(r.recoveryCodes);
      setWizardStep(3);
      setSetup(null);
      setVerifyCode("");
      push({ kind: "success", title: "2FA enabled" });
      void loadOverview();
    } catch (e) {
      push({ kind: "error", title: "Invalid code", desc: friendlyError(e) });
    } finally {
      setBusy2fa(false);
    }
  };

  const finishWizard = () => {
    setRecoveryCodes(null);
    setCodesSaved(false);
    setWizardStep(1);
  };

  const disable2fa = async () => {
    setBusy2fa(true);
    try {
      await api.twofaDisable();
      setConfirmDisable(false);
      push({ kind: "success", title: "2FA disabled" });
      void loadOverview();
    } catch (e) {
      const msg = friendlyError(e);
      if (/Recent authentication/i.test(msg)) {
        setConfirmDisable(false);
        needReauth("disable 2FA", () => setConfirmDisable(true));
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
      setWizardStep(3);
      setCodesSaved(false);
      push({ kind: "success", title: "New recovery codes issued", desc: "Old codes no longer work." });
      void loadOverview();
    } catch (e) {
      const msg = friendlyError(e);
      if (/Recent authentication/i.test(msg)) needReauth("regenerate recovery codes", () => void regenCodes());
      else push({ kind: "error", title: "Regeneration failed", desc: msg });
    } finally {
      setBusy2fa(false);
    }
  };

  const downloadCodes = () => {
    if (!recoveryCodes) return;
    const blob = new Blob([`Harsh Control — recovery codes\nGenerated ${new Date().toISOString()}\n\n${recoveryCodes.join("\n")}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "harsh-control-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const revokeSession = async (s: Session) => {
    try {
      await api.revokeSession(s.id);
      push({ kind: "success", title: s.current ? "Signed out" : "Session revoked" });
      setRevokeTarget(null);
      if (s.current) window.location.reload();
      else void loadSessions();
    } catch (e) {
      push({ kind: "error", title: "Revoke failed", desc: friendlyError(e) });
    }
  };

  const revokeOthers = async () => {
    try {
      await api.revokeOtherSessions();
      push({ kind: "success", title: "Other sessions revoked" });
      void loadSessions();
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
        needReauth("revoke all sessions", () => setConfirmRevokeAll(true));
      } else {
        push({ kind: "error", title: "Revoke failed", desc: msg });
      }
    }
  };

  const score = passwordScore(newPw);

  return (
    <>
      <PageHead title="Security" desc="Real account state from the server. No scores, no guesses." />

      <div className="ctl-sec-grid">
        <Section title="AUTHENTICATION" loading={loading && !overview && !overviewError} error={overviewError} onRetry={() => void loadOverview()}>
          {overview ? (
            <dl style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13.5, margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><dt>Signed in as</dt><dd style={{ margin: 0 }}><b>{overview.email}</b></dd></div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><dt>Role</dt><dd style={{ margin: 0 }}><Badge tone="blue">{overview.role}</Badge></dd></div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><dt>Password last changed</dt><dd style={{ margin: 0 }}><b>{overview.passwordChangedAt ? new Date(overview.passwordChangedAt).toLocaleString() : "Never recorded"}</b></dd></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><dt>Two-factor</dt><dd style={{ margin: 0 }}><Badge tone={overview.totpEnabled ? "green" : "amber"}>{overview.totpEnabled ? "ENABLED" : "DISABLED"}</Badge></dd></div>
              {overview.totpEnabled && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><dt>Recovery codes left</dt><dd style={{ margin: 0 }}><b>{overview.recoveryCodesRemaining}</b></dd></div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><dt>Last login</dt><dd style={{ margin: 0 }}><b>{overview.lastLoginAt ? new Date(overview.lastLoginAt).toLocaleString() : "—"}</b></dd></div>
            </dl>
          ) : null}
        </Section>

        <Section title="CHANGE PASSWORD" loading={false} error={null} onRetry={() => undefined}>
          <form onSubmit={changePassword} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="Current password" required error={pwError ?? undefined}>
              {(id) => <input id={id} className="ctl-input" type={showPw ? "text" : "password"} autoComplete="current-password" required value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />}
            </Field>
            <Field label="New password" required hint="12+ characters with mixed case, a number, and a symbol.">
              {(id) => <input id={id} className="ctl-input" type={showPw ? "text" : "password"} autoComplete="new-password" required minLength={12} value={newPw} onChange={(e) => setNewPw(e.target.value)} aria-describedby={`${id}-meter`} />}
            </Field>
            {newPw && (
              <div id="sec-pw-meter" role="status" aria-label={`Password strength: ${SCORE_LABEL[score]}`}>
                <div className="ctl-meter"><i className={`ctl-meter-${score}`} /></div>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{SCORE_LABEL[score]}</span>
              </div>
            )}
            <Field label="Confirm new password" required>
              {(id) => <input id={id} className="ctl-input" type={showPw ? "text" : "password"} autoComplete="new-password" required value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />}
            </Field>
            <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} /> Show passwords
            </label>
            <button type="submit" className="ctl-btn ctl-btn--primary" disabled={pwBusy} style={{ justifyContent: "center" }}>{pwBusy ? "Changing…" : "Change password"}</button>
            <p style={{ fontSize: 12, color: "#8a93a3" }}>Changing your password revokes all other sessions.</p>
          </form>
        </Section>
      </div>

      <div className="ctl-sec-grid" style={{ marginTop: 12 }}>
        <Section title="TWO-FACTOR AUTHENTICATION" loading={false} error={null} onRetry={() => undefined}>
          {!overview?.totpEnabled ? (
            !setup && !recoveryCodes ? (
              <>
                <p style={{ fontSize: 13.5, color: "#4b5563" }}>Add TOTP (authenticator app) as a second factor. You will enter a 6-digit code after your password.</p>
                <button type="button" className="ctl-btn ctl-btn--primary" onClick={() => void startSetup()} disabled={busy2fa} style={{ marginTop: 10 }}>{busy2fa ? "Preparing…" : "Start setup"}</button>
              </>
            ) : setup ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="ctl-steps" aria-label="2FA setup progress">
                  <span className={`ctl-step${wizardStep >= 1 ? " active" : ""}`}>1 · Scan</span>
                  <span className={`ctl-step${wizardStep >= 2 ? " active" : ""}`}>2 · Verify</span>
                  <span className={`ctl-step${wizardStep >= 3 ? " active" : ""}`}>3 · Save codes</span>
                </div>
                {wizardStep === 1 && (
                  <>
                    {setup.qrDataUrl && <img src={setup.qrDataUrl} alt="Scan this QR code with your authenticator app" width={180} height={180} style={{ borderRadius: 12, border: "1px solid #e6e8ee" }} />}
                    <Field label="Manual entry secret">
                      {(id) => (
                        <span style={{ display: "flex", gap: 8 }}>
                          <input id={id} className="ctl-input" readOnly value={setup.secret} onFocus={(e) => e.target.select()} style={{ flex: 1 }} />
                          <button type="button" className="ctl-mini-btn" onClick={() => navigator.clipboard.writeText(setup.secret).catch(() => undefined)}>Copy</button>
                        </span>
                      )}
                    </Field>
                    <p style={{ fontSize: 12, color: "#6b7280" }}>Can't scan? Enter the secret manually — the app name and issuer are encoded in the QR.</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" className="ctl-btn ctl-btn--primary" onClick={() => setWizardStep(2)}>Continue</button>
                      <button type="button" className="ctl-btn ctl-btn--ghost" onClick={() => setSetup(null)}>Cancel</button>
                    </div>
                  </>
                )}
                {wizardStep === 2 && (
                  <form onSubmit={confirmEnable} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Field label="6-digit code from your app" required>
                      {(id) => <input id={id} className="ctl-input" inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" required value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" autoFocus />}
                    </Field>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="submit" className="ctl-btn ctl-btn--primary" disabled={busy2fa}>{busy2fa ? "Verifying…" : "Verify & enable"}</button>
                      <button type="button" className="ctl-btn ctl-btn--ghost" onClick={() => setWizardStep(1)}>Back</button>
                    </div>
                  </form>
                )}
              </div>
            ) : null
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 13.5, color: "#4b5563" }}>Enabled{overview.totpEnabledAt ? ` since ${new Date(overview.totpEnabledAt).toLocaleDateString()}` : ""}.</p>
              <p className="ctl-reauth-note">Disabling 2FA or regenerating codes needs re-verification first.</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="ctl-btn ctl-btn--secondary ctl-btn--sm" onClick={() => void regenCodes()} disabled={busy2fa}>Regenerate recovery codes</button>
                <button type="button" className="ctl-btn ctl-btn--danger ctl-btn--sm" onClick={() => setConfirmDisable(true)}>Disable 2FA…</button>
              </div>
            </div>
          )}
          {recoveryCodes && wizardStep === 3 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700 }}>Recovery codes — shown once. Store them safely.</p>
              <div className="ctl-code-grid" style={{ marginTop: 8 }}>{recoveryCodes.map((c) => (<span key={c}>{c}</span>))}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <button type="button" className="ctl-btn ctl-btn--ghost ctl-btn--sm" onClick={() => navigator.clipboard.writeText(recoveryCodes.join("\n")).catch(() => undefined)}>Copy codes</button>
                <button type="button" className="ctl-btn ctl-btn--ghost ctl-btn--sm" onClick={downloadCodes}>Download .txt</button>
              </div>
              <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
                <input type="checkbox" checked={codesSaved} onChange={(e) => setCodesSaved(e.target.checked)} /> I saved these codes somewhere safe
              </label>
              <button type="button" className="ctl-btn ctl-btn--primary ctl-btn--sm" disabled={!codesSaved} style={{ marginTop: 8 }} onClick={finishWizard}>Done</button>
            </div>
          )}
        </Section>

        <Section
          title="SECURITY EVENTS"
          action={<Link to="/private/audit" className="ctl-stat-link">Full log →</Link>}
          loading={loading && events.length === 0 && !eventsError}
          error={eventsError}
          onRetry={() => void loadEvents()}
        >
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
        </Section>
      </div>

      <Section
        title={`SESSIONS (${sessions.length} ACTIVE)`}
        action={
          <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="ctl-btn ctl-btn--ghost ctl-btn--sm" onClick={() => void revokeOthers()}>Revoke others</button>
            <button type="button" className="ctl-btn ctl-btn--danger ctl-btn--sm" onClick={() => setConfirmRevokeAll(true)}>Revoke all…</button>
          </span>
        }
        loading={loading && sessions.length === 0 && !sessionsError}
        error={sessionsError}
        onRetry={() => void loadSessions()}
      >
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
                <button type="button" className="ctl-mini-btn danger" onClick={() => setRevokeTarget(s)} aria-label={`Revoke session on ${s.device}`}>Revoke</button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Dialog open={reauthOpen} onClose={() => setReauthOpen(false)} title="Confirm it is you" description={pendingAction ? `To ${pendingAction.label}, verify again (valid ~10 minutes).` : "Sensitive actions need a fresh verification (valid ~10 minutes)."}>
        <form onSubmit={doReauth} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Password" required>
            {(id) => <input id={id} className="ctl-input" type="password" required value={reauthPw} onChange={(e) => setReauthPw(e.target.value)} autoFocus autoComplete="current-password" />}
          </Field>
          {overview?.totpEnabled && (
            <Field label="2FA code or recovery code" required>
              {(id) => <input id={id} className="ctl-input" value={reauthCode} onChange={(e) => setReauthCode(e.target.value)} required autoComplete="one-time-code" />}
            </Field>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="ctl-btn ctl-btn--ghost" onClick={() => setReauthOpen(false)}>Cancel</button>
            <button type="submit" className="ctl-btn ctl-btn--primary" disabled={reauthBusy}>{reauthBusy ? "Verifying…" : "Verify"}</button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => {
          if (revokeTarget) void revokeSession(revokeTarget);
        }}
        title={revokeTarget?.current ? "Sign out this session?" : `Revoke session on ${revokeTarget?.device ?? ""}?`}
        description={revokeTarget?.current ? "You will be signed out on this device immediately." : "That device will be signed out immediately. This is logged."}
        confirmLabel="Revoke session"
        busy={false}
      />
      <ConfirmDialog open={confirmDisable} onClose={() => setConfirmDisable(false)} onConfirm={() => void disable2fa()} title="Disable two-factor authentication?" description="Your account will rely on password alone. This is logged." confirmLabel="Disable 2FA" busy={busy2fa} />
      <ConfirmDialog open={confirmRevokeAll} onClose={() => setConfirmRevokeAll(false)} onConfirm={() => void revokeAll()} title="Revoke all sessions?" description="You will be signed out everywhere, including this device." confirmLabel="Revoke all" busy={false} />
    </>
  );
}
