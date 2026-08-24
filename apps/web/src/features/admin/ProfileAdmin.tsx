import { useEffect, useState } from "react";

import { api } from "../../lib/api";
import type { Profile } from "@hp/shared";
import { ArrayInput, ErrorNote, Field, TextArea, TextInput } from "./fields";

export function ProfileAdmin() {
  const [profile, setProfile] = useState<Partial<Profile> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.admin.profile().then((r) => setProfile(r.profile)).catch((e) => setError(e.message));
  }, []);

  if (!profile) return <span className="mono mono-dim">LOADING…</span>;

  const save = async () => {
    setBusy(true);
    setError(null);
    setOk(false);
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
      setOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="admin-head">
        <h1>Profile</h1>
      </div>
      <ErrorNote error={error} />
      {ok && <div className="form-status ok" style={{ marginBottom: 14 }}>✓ PROFILE SAVED</div>}

      <div className="editor-panel">
        <div className="editor-section">
          <h3>IDENTITY</h3>
          <div className="editor-grid">
            <Field label="NAME"><TextInput value={profile.name ?? ""} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
            <Field label="LOCATION"><TextInput value={profile.location ?? ""} onChange={(e) => setProfile({ ...profile, location: e.target.value })} /></Field>
            <Field label="HEADLINE"><TextInput value={profile.headline ?? ""} onChange={(e) => setProfile({ ...profile, headline: e.target.value })} /></Field>
            <Field label="SUB-HEADLINE"><TextInput value={profile.subHeadline ?? ""} onChange={(e) => setProfile({ ...profile, subHeadline: e.target.value })} /></Field>
            <Field label="BIO" full><TextArea rows={5} value={profile.bio ?? ""} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} /></Field>
            <Field label="EMAIL"><TextInput type="email" value={profile.email ?? ""} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></Field>
            <Field label="AVAILABILITY"><TextInput value={profile.availability ?? ""} onChange={(e) => setProfile({ ...profile, availability: e.target.value })} /></Field>
            <Field label="AVATAR URL"><TextInput value={profile.avatarUrl ?? ""} onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })} /></Field>
            <Field label="RESUME URL"><TextInput value={profile.resumeUrl ?? ""} onChange={(e) => setProfile({ ...profile, resumeUrl: e.target.value })} /></Field>
          </div>
        </div>
        <div className="editor-section">
          <h3>SOCIAL LINKS</h3>
          <ArrayInput
            value={(profile.socials ?? []).map((s) => `${s.label}|${s.url}`)}
            onChange={(v) =>
              setProfile({
                ...profile,
                socials: v.map((row, i) => {
                  const [label, url] = row.split("|");
                  return { label: label ?? "Link", url: url ?? "", handle: null, order: i + 1 };
                }),
              })
            }
            placeholder="Label|https://url — press Enter"
          />
        </div>
        <div className="editor-foot">
          <button className="btn btn-solid" onClick={save} disabled={busy}>{busy ? "SAVING…" : "SAVE PROFILE"}</button>
        </div>
      </div>
    </>
  );
}
