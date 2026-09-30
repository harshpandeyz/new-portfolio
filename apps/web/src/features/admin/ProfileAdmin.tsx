import { useEffect, useMemo, useRef, useState } from "react";

import { api, resolveMediaUrl } from "../../lib/api";
import type { Profile } from "@hp/shared";
import { AdminIcon } from "./Icon";
import { ErrorState, PageHead, friendlyError, useToast } from "./ui";

const DRAFT_KEY = "ctl:profile:draft";
const BIO_LIMIT = 1200;

function readDraft(): Partial<Profile> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; profile: Partial<Profile> };
    if (Date.now() - parsed.savedAt > 7 * 24 * 3600 * 1000) return null;
    return parsed.profile;
  } catch { return null; }
}

function comparable(profile: Partial<Profile>) {
  return JSON.stringify({
    name: profile.name ?? "", headline: profile.headline ?? "", subHeadline: profile.subHeadline ?? "",
    bio: profile.bio ?? "", location: profile.location ?? "", email: profile.email ?? "",
    availability: profile.availability ?? "", avatarUrl: profile.avatarUrl ?? null,
    resumeUrl: profile.resumeUrl ?? null, resumeLabel: profile.resumeLabel ?? null,
    socials: (profile.socials ?? []).map((s, i) => ({ label: s.label, url: s.url, handle: s.handle ?? null, order: s.order ?? i })),
  });
}

export function ProfileAdmin() {
  const [profile, setProfile] = useState<Partial<Profile> | null>(null);
  const [baseline, setBaseline] = useState<Partial<Profile> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "resume" | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [draftNotice, setDraftNotice] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const resumeInput = useRef<HTMLInputElement>(null);
  const { push } = useToast();

  const load = async () => {
    setError(null);
    try {
      const r = await api.admin.profile();
      if (!r.profile) throw new Error("Profile is not configured.");
      setBaseline(r.profile);
      const draft = readDraft();
      if (draft && comparable(draft) !== comparable(r.profile)) {
        setProfile({ ...r.profile, ...draft });
        setDraftNotice(true);
      } else setProfile(r.profile);
    } catch (e) { setError(friendlyError(e)); }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!profile) return;
    const timer = window.setTimeout(() => {
      try {
        if (baseline && comparable(profile) === comparable(baseline)) localStorage.removeItem(DRAFT_KEY);
        else localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), profile }));
      } catch { /* Local drafts are optional. */ }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [profile, baseline]);

  const dirty = useMemo(() => Boolean(profile && baseline && comparable(profile) !== comparable(baseline)), [profile, baseline]);
  const completeness = useMemo(() => {
    if (!profile) return { complete: 0, total: 8, percent: 0 };
    const checks = [profile.name, profile.headline, profile.bio, profile.location, profile.email, profile.avatarUrl, profile.resumeUrl, profile.socials?.length];
    const complete = checks.filter((value) => typeof value === "string" ? value.trim().length > 0 : Boolean(value)).length;
    return { complete, total: checks.length, percent: Math.round(complete / checks.length * 100) };
  }, [profile]);

  if (error && !profile) return <><PageHead title="Profile" desc="Public identity, biography and links." /><ErrorState message={error} onRetry={() => void load()} /></>;
  if (!profile) return <><PageHead title="Profile" desc="Public identity, biography and links." /><div className="ctl-skeleton" aria-label="Loading profile" /></>;

  const update = (patch: Partial<Profile>) => setProfile((prev) => prev ? { ...prev, ...patch } : prev);

  const upload = async (kind: "avatar" | "resume", file?: File) => {
    if (!file) return;
    const expected = kind === "avatar" ? file.type.startsWith("image/") : file.type === "application/pdf";
    if (!expected) {
      push({ kind: "error", title: kind === "avatar" ? "Choose an image file" : "Choose a PDF resume" });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      push({ kind: "error", title: "File too large", desc: "The media library supports files up to 25 MB." });
      return;
    }
    setUploading(kind); setUploadProgress(0);
    try {
      const asset = await api.admin.uploadMedia(file, setUploadProgress);
      if (kind === "avatar") update({ avatarUrl: asset.url });
      else update({ resumeUrl: asset.url, resumeLabel: file.name.replace(/\.pdf$/i, "") });
      push({ kind: "success", title: kind === "avatar" ? "Profile image uploaded" : "Resume uploaded", desc: "Save the profile to publish this asset." });
    } catch (e) { push({ kind: "error", title: "Upload failed", desc: friendlyError(e) }); }
    finally { setUploading(null); setUploadProgress(0); if (kind === "avatar" && avatarInput.current) avatarInput.current.value = ""; if (kind === "resume" && resumeInput.current) resumeInput.current.value = ""; }
  };

  const save = async () => {
    if (!profile.name?.trim() || !profile.email?.trim()) {
      push({ kind: "error", title: "Name and email are required" }); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
      push({ kind: "error", title: "Enter a valid email address" }); return;
    }
    const invalidSocial = (profile.socials ?? []).find((social) => {
      try { return !["http:", "https:"].includes(new URL(social.url).protocol); } catch { return true; }
    });
    if (invalidSocial) { push({ kind: "error", title: `Check the ${invalidSocial.label || "social"} URL` }); return; }
    setBusy(true);
    try {
      await api.admin.updateProfile({
        name: profile.name.trim(), headline: profile.headline?.trim() ?? "", subHeadline: profile.subHeadline?.trim() ?? "",
        bio: profile.bio?.trim() ?? "", location: profile.location?.trim() ?? "", email: profile.email.trim(),
        availability: profile.availability ?? "", avatarUrl: profile.avatarUrl || null,
        resumeUrl: profile.resumeUrl || null, resumeLabel: profile.resumeLabel || null,
        socials: (profile.socials ?? []).map((s, i) => ({ label: s.label.trim(), url: s.url.trim(), handle: s.handle ?? null, order: i })),
      });
      const next = { ...profile, socials: (profile.socials ?? []).map((s, i) => ({ ...s, order: i })) };
      setProfile(next); setBaseline(next); setDraftNotice(false);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* Nothing else to clear. */ }
      push({ kind: "success", title: "Profile saved", desc: "The public profile is updated." });
    } catch (e) { push({ kind: "error", title: "Save failed", desc: friendlyError(e) }); }
    finally { setBusy(false); }
  };

  const discardDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* no-op */ }
    setDraftNotice(false);
    if (baseline) setProfile(baseline);
  };

  return <>
    <PageHead title="Profile" desc="Edit the public identity and preview changes as you make them."
      actions={<><a className="ctl-btn ctl-btn--ghost" href="/" target="_blank" rel="noopener noreferrer"><AdminIcon name="external" size={15} />Public site</a><button className="ctl-btn ctl-btn--primary" onClick={() => void save()} disabled={busy || uploading !== null}>{busy ? "Saving…" : dirty ? "Save changes" : "Saved"}</button></>} />
    {error && <ErrorState message={error} onRetry={() => void load()} />}
    {draftNotice && <div className="ctl-draft" role="status"><span>A local draft was restored. Save it to publish, or reload the server version.</span><button className="ctl-mini-btn" onClick={discardDraft}>Discard draft</button></div>}
    <div className="ctl-profile-layout">
      <div className="ctl-profile-editor">
        <section className="ctl-editor-section">
          <header className="ctl-section-heading"><div><h2>Identity</h2><p>Name, role and introduction shown across the public site.</p></div></header>
          <div className="ctl-form-grid">
            <div className="ctl-field"><label htmlFor="pf-name">Name</label><input id="pf-name" className="ctl-input" value={profile.name ?? ""} onChange={(e) => update({ name: e.target.value })} maxLength={100} /></div>
            <div className="ctl-field"><label htmlFor="pf-loc">Location</label><input id="pf-loc" className="ctl-input" value={profile.location ?? ""} onChange={(e) => update({ location: e.target.value })} maxLength={120} /></div>
            <div className="ctl-field"><label htmlFor="pf-head">Headline</label><input id="pf-head" className="ctl-input" value={profile.headline ?? ""} onChange={(e) => update({ headline: e.target.value })} maxLength={160} /></div>
            <div className="ctl-field"><label htmlFor="pf-sub">Supporting headline</label><input id="pf-sub" className="ctl-input" value={profile.subHeadline ?? ""} onChange={(e) => update({ subHeadline: e.target.value })} maxLength={180} /></div>
            <div className="ctl-field full"><label htmlFor="pf-bio">Biography <span className="ctl-field-count">{(profile.bio ?? "").length}/{BIO_LIMIT}</span></label><textarea id="pf-bio" className="ctl-textarea" rows={6} maxLength={BIO_LIMIT} value={profile.bio ?? ""} onChange={(e) => update({ bio: e.target.value })} /></div>
            <div className="ctl-field"><label htmlFor="pf-email">Public email</label><input id="pf-email" className="ctl-input" type="email" autoComplete="email" value={profile.email ?? ""} onChange={(e) => update({ email: e.target.value })} /></div>
            <div className="ctl-field"><label htmlFor="pf-avail">Availability</label><input id="pf-avail" className="ctl-input" value={profile.availability ?? ""} onChange={(e) => update({ availability: e.target.value })} maxLength={120} /></div>
          </div>
        </section>
        <section className="ctl-editor-section">
          <header className="ctl-section-heading"><div><h2>Image & resume</h2><p>Uploads use the private media library. New assets publish when you save.</p></div></header>
          <div className="ctl-asset-fields">
            <div className="ctl-asset-field"><div className="ctl-asset-preview">{profile.avatarUrl ? <img src={resolveMediaUrl(profile.avatarUrl)} alt="Current profile" /> : <AdminIcon name="profile" size={22} />}</div><div className="ctl-asset-copy"><strong>Profile image</strong><span>{profile.avatarUrl ? "Image linked" : "No image configured"}</span><div><button className="ctl-btn ctl-btn--secondary ctl-btn--sm" onClick={() => avatarInput.current?.click()} disabled={uploading !== null}>{uploading === "avatar" ? `Uploading ${uploadProgress}%` : "Upload image"}</button>{profile.avatarUrl && <button className="ctl-mini-btn" onClick={() => update({ avatarUrl: null })}>Remove</button>}</div></div><input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" hidden onChange={(e) => void upload("avatar", e.target.files?.[0])} /></div>
            <div className="ctl-asset-field"><div className="ctl-asset-preview ctl-asset-preview--file"><AdminIcon name="file" size={22} /></div><div className="ctl-asset-copy"><strong>Resume</strong><span>{profile.resumeLabel || (profile.resumeUrl ? "Resume linked" : "No resume configured")}</span><div><button className="ctl-btn ctl-btn--secondary ctl-btn--sm" onClick={() => resumeInput.current?.click()} disabled={uploading !== null}>{uploading === "resume" ? `Uploading ${uploadProgress}%` : "Upload PDF"}</button>{profile.resumeUrl && <button className="ctl-mini-btn" onClick={() => update({ resumeUrl: null, resumeLabel: null })}>Remove</button>}</div></div><input ref={resumeInput} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => void upload("resume", e.target.files?.[0])} /></div>
          </div>
        </section>
        <section className="ctl-editor-section">
          <header className="ctl-section-heading"><div><h2>Social links</h2><p>Public links displayed on your portfolio.</p></div><button className="ctl-btn ctl-btn--ghost ctl-btn--sm" onClick={() => update({ socials: [...(profile.socials ?? []), { label: "", url: "", handle: null, order: (profile.socials ?? []).length }] })}><AdminIcon name="plus" size={15} />Add link</button></header>
          <div className="ctl-social-editor">{(profile.socials ?? []).length === 0 && <p className="ctl-hint">No social links configured.</p>}{(profile.socials ?? []).map((social, index) => <div className="ctl-social-row" key={social.id ?? index}><AdminIcon name="external" size={16} /><input className="ctl-input" value={social.label} onChange={(e) => update({ socials: (profile.socials ?? []).map((item, i) => i === index ? { ...item, label: e.target.value } : item) })} aria-label={`Social platform ${index + 1}`} placeholder="Platform" /><input className="ctl-input" type="url" value={social.url} onChange={(e) => update({ socials: (profile.socials ?? []).map((item, i) => i === index ? { ...item, url: e.target.value } : item) })} aria-label={`${social.label || "Social"} URL`} placeholder="https://…" /><button className="ctl-icon-btn" aria-label={`Remove ${social.label || "social link"}`} onClick={() => update({ socials: (profile.socials ?? []).filter((_, i) => i !== index) })}><AdminIcon name="trash" size={15} /></button></div>)}</div>
        </section>
      </div>
      <aside className="ctl-profile-preview" aria-label="Live public profile preview">
        <div className="ctl-profile-preview-cover" /><div className="ctl-profile-preview-body">
          <div className="ctl-profile-preview-avatar">{profile.avatarUrl ? <img src={resolveMediaUrl(profile.avatarUrl)} alt="" /> : <AdminIcon name="profile" size={26} />}</div>
          <h2>{profile.name || "Your name"}</h2><strong className="ctl-profile-preview-headline">{profile.headline || "Your headline"}</strong>
          {profile.subHeadline && <p>{profile.subHeadline}</p>}{profile.location && <span className="ctl-profile-location"><AdminIcon name="external" size={13} />{profile.location}</span>}
          <p className="ctl-profile-preview-bio">{profile.bio || "Your biography will appear here."}</p>
          {profile.availability && <span className="ctl-profile-availability">{profile.availability}</span>}
          <div className="ctl-profile-completeness"><div className="ctl-profile-completeness-head"><span>Profile completeness</span><strong>{completeness.percent}%</strong></div><div className="ctl-profile-progress"><i style={{ width: `${completeness.percent}%` }} /></div><small>{completeness.complete} of {completeness.total} profile details filled</small></div>
          <div className="ctl-profile-socials">{(profile.socials ?? []).filter((social) => social.label && social.url).map((social, index) => <a key={social.id ?? index} href={social.url} target="_blank" rel="noopener noreferrer"><AdminIcon name="external" size={13} />{social.label}</a>)}</div>
          {profile.resumeUrl && <a className="ctl-profile-resume" href={resolveMediaUrl(profile.resumeUrl)} target="_blank" rel="noopener noreferrer"><AdminIcon name="file" size={14} />{profile.resumeLabel || "Resume"}</a>}
        </div>
      </aside>
    </div>
    <div className="ctl-sticky-save"><span className={dirty ? "ctl-save-state is-dirty" : "ctl-save-state"}>{busy ? "Saving profile…" : dirty ? "Unsaved changes" : "All changes saved"}</span><button className="ctl-btn ctl-btn--primary" onClick={() => void save()} disabled={busy || uploading !== null || !dirty}>{busy ? "Saving…" : "Save profile"}</button></div>
  </>;
}
