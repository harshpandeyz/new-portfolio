import { useEffect, useState } from "react";

import { api } from "../../lib/api";
import type { Profile } from "@hp/shared";
import { ErrorState, PageHead, friendlyError, useToast } from "./ui";

const DRAFT_KEY = "ctl:profile:draft";

function readDraft(): Partial<Profile> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; profile: Partial<Profile> };
    // Drafts older than 7 days are stale — ignore them.
    if (Date.now() - parsed.savedAt > 7 * 24 * 3600 * 1000) return null;
    return parsed.profile;
  } catch {
    return null;
  }
}

export function ProfileAdmin() {
  const [profile, setProfile] = useState<Partial<Profile> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draftNotice, setDraftNotice] = useState(false);
  const { push } = useToast();

  const load = async () => {
    setError(null);
    try {
      const r = await api.admin.profile();
      const draft = readDraft();
      if (draft && JSON.stringify(draft) !== JSON.stringify(r.profile)) {
        setProfile(draft);
        setDraftNotice(true);
      } else {
        setProfile(r.profile);
      }
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // Autosave draft locally (never touches the server until Save).
  useEffect(() => {
    if (!profile) return;
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), profile }));
      } catch {
        /* storage unavailable — draft simply won't persist */
      }
    }, 800);
    return () => window.clearTimeout(t);
  }, [profile]);

  if (error && !profile) return (<><PageHead title="Profile" desc="Public identity, bio, and links." /><ErrorState message={error} onRetry={() => void load()} /></>);

  if (!profile) return (<><PageHead title="Profile" desc="Public identity, bio, and links." /><div className="ctl-card"><p style={{ color: "#8a93a3" }}>Loading profile…</p></div></>);

  const save = async () => {
    if (!profile.name?.trim() || !profile.email?.trim()) {
      push({ kind: "error", title: "Name and email required" });
      return;
    }
    setBusy(true);
    try {
      await api.admin.updateProfile({
        name: profile.name,
        headline: profile.headline,
        subHeadline: profile.subHeadline,
        bio: profile.bio,
        location: profile.location,
        email: profile.email,
        availability: profile.availability ?? "",
        avatarUrl: profile.avatarUrl || null,
        resumeUrl: profile.resumeUrl || null,
        resumeLabel: profile.resumeLabel || null,
        socials: (profile.socials ?? []).map((s, i) => ({ label: s.label, url: s.url, handle: s.handle ?? null, order: s.order ?? i })),
      });
      push({ kind: "success", title: "Profile saved", desc: "Public site updated immediately." });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* already clean */
      }
      setDraftNotice(false);
    } catch (e) {
      push({ kind: "error", title: "Save failed", desc: friendlyError(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead title="Profile" desc="Structured editor with validation. Socials sync to the public site."
        actions={<button className="ctl-btn ctl-btn--primary" onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>} />
      {error && <ErrorState message={error} onRetry={() => void save()} />}
      {draftNotice && (
        <div className="ctl-draft" role="status">
          <span>Unsaved draft restored from this browser. Save to publish it, or discard to reload the server version.</span>
          <button className="ctl-mini-btn" onClick={() => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ } setDraftNotice(false); void load(); }}>Discard draft</button>
        </div>
      )}
      <div className="ctl-editor">
        <div className="ctl-editor-section">
          <h3>IDENTITY</h3>
          <div className="ctl-form-grid">
            <div className="ctl-field"><label htmlFor="pf-name">Name</label><input id="pf-name" className="ctl-input" value={profile.name ?? ""} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></div>
            <div className="ctl-field"><label htmlFor="pf-loc">Location</label><input id="pf-loc" className="ctl-input" value={profile.location ?? ""} onChange={(e) => setProfile({ ...profile, location: e.target.value })} /></div>
            <div className="ctl-field"><label htmlFor="pf-head">Headline</label><input id="pf-head" className="ctl-input" value={profile.headline ?? ""} onChange={(e) => setProfile({ ...profile, headline: e.target.value })} /></div>
            <div className="ctl-field"><label htmlFor="pf-sub">Sub-headline</label><input id="pf-sub" className="ctl-input" value={profile.subHeadline ?? ""} onChange={(e) => setProfile({ ...profile, subHeadline: e.target.value })} /></div>
            <div className="ctl-field full"><label htmlFor="pf-bio">Bio</label><textarea id="pf-bio" className="ctl-textarea" rows={5} value={profile.bio ?? ""} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} /></div>
            <div className="ctl-field"><label htmlFor="pf-email">Email</label><input id="pf-email" className="ctl-input" type="email" value={profile.email ?? ""} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></div>
            <div className="ctl-field"><label htmlFor="pf-avail">Availability</label><input id="pf-avail" className="ctl-input" value={profile.availability ?? ""} onChange={(e) => setProfile({ ...profile, availability: e.target.value })} /></div>
            <div className="ctl-field"><label htmlFor="pf-avatar">Avatar URL</label><input id="pf-avatar" className="ctl-input" value={profile.avatarUrl ?? ""} onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })} /></div>
            <div className="ctl-field"><label htmlFor="pf-resume">Resume URL</label><input id="pf-resume" className="ctl-input" value={profile.resumeUrl ?? ""} onChange={(e) => setProfile({ ...profile, resumeUrl: e.target.value })} /></div>
          </div>
        </div>
        <div className="ctl-editor-section">
          <h3>SOCIAL LINKS</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(profile.socials ?? []).map((s, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr auto", gap: 8 }}>
                <input className="ctl-input" value={s.label} onChange={(e) => setProfile({ ...profile, socials: (profile.socials ?? []).map((x, xi) => (xi === i ? { ...x, label: e.target.value } : x)) })} aria-label="Social label" />
                <input className="ctl-input" value={s.url} onChange={(e) => setProfile({ ...profile, socials: (profile.socials ?? []).map((x, xi) => (xi === i ? { ...x, url: e.target.value } : x)) })} aria-label="Social URL" />
                <button className="ctl-mini-btn danger" onClick={() => setProfile({ ...profile, socials: (profile.socials ?? []).filter((_, xi) => xi !== i) })}>Remove</button>
              </div>
            ))}
            <button className="ctl-btn ctl-btn--ghost ctl-btn--sm" style={{ alignSelf: "flex-start" }} onClick={() => setProfile({ ...profile, socials: [...(profile.socials ?? []), { label: "GitHub", url: "https://", handle: null, order: (profile.socials ?? []).length }] })}>+ Add link</button>
          </div>
        </div>
        <div className="ctl-editor-foot">
          <a className="ctl-btn ctl-btn--ghost" href="/" target="_blank" rel="noopener noreferrer">Preview public site</a>
          <button className="ctl-btn ctl-btn--primary" onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
        </div>
      </div>
    </>
  );
}
