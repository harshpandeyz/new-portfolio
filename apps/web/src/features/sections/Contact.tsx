import { useState } from "react";

import { api } from "../../lib/api";
import { useData } from "../../lib/data";
import { unlock } from "../../lib/achievements";
import { contactSchema } from "@hp/shared";

export function Contact() {
  const { profile } = useData();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", company: "" });
  const [status, setStatus] = useState<{ kind: "idle" | "ok" | "err"; msg: string }>({ kind: "idle", msg: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      setStatus({ kind: "err", msg: "⚠ VALIDATION FAILED — CHECK NAME / EMAIL / MESSAGE (MIN 10 CHARS)" });
      return;
    }
    setBusy(true);
    try {
      await api.contact(form);
      setStatus({ kind: "ok", msg: "✓ SIGNAL TRANSMITTED — STORED & QUEUED FOR REVIEW" });
      unlock("signal");
      setForm({ name: "", email: "", subject: "", message: "", company: "" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transmission failed";
      setStatus({ kind: "err", msg: `⛔ ${msg.toUpperCase()}` });
    } finally {
      setBusy(false);
    }
  };

  const social = (label: string) => profile?.socials.find((s) => s.label.toLowerCase() === label.toLowerCase())?.url;

  return (
    <section className="sys-section" id="contact" aria-label="Contact">
      <div className="container">
        <div className="section-head" data-reveal>
          <span className="section-index">06 / COMMUNICATION</span>
          <div>
            <h2 className="section-title">Open a Channel</h2>
            <p className="section-sub">
              Internships, backend engineering work, full-stack builds, AI systems, hackathons —
              messages land directly in the operator console.
            </p>
          </div>
        </div>

        <div className="contact-grid">
          <div className="contact-info">
            <h3 data-reveal>Have an opportunity, a system to build, or a hard problem?</h3>
            <p data-reveal>
              Direct channels work fastest. Every message sent through this interface is stored,
              rate-limited and reviewed — nothing gets lost in a spam folder.
            </p>
            <div className="contact-channels" data-reveal>
              <a className="contact-channel" href={`mailto:${profile?.email ?? "harshap17058@gmail.com"}`}>
                <span className="cc-k">EMAIL</span>
                <span className="cc-v">{profile?.email ?? "harshap17058@gmail.com"}</span>
              </a>
              <a className="contact-channel" href={social("linkedin") ?? "https://www.linkedin.com/in/harshpandeyz/"} target="_blank" rel="noopener noreferrer">
                <span className="cc-k">LINKEDIN</span>
                <span className="cc-v">/in/harshpandeyz</span>
              </a>
              <a className="contact-channel" href={social("github") ?? "https://github.com/harshpandeyz"} target="_blank" rel="noopener noreferrer">
                <span className="cc-k">GITHUB</span>
                <span className="cc-v">@harshpandeyz</span>
              </a>
              <a className="contact-channel" href={profile?.resumeUrl ?? "/files/HARSH-RESUME.pdf"} target="_blank" rel="noopener noreferrer">
                <span className="cc-k">RESUME</span>
                <span className="cc-v">{profile?.resumeLabel ?? "HARSH-RESUME.pdf"}</span>
              </a>
            </div>
          </div>

          <form className="contact-form brackets" onSubmit={submit} data-reveal noValidate>
            <div className="fields">
              <div className="row">
                <div className="field">
                  <label htmlFor="cf-name">NAME</label>
                  <input id="cf-name" className="input" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
                </div>
                <div className="field">
                  <label htmlFor="cf-email">EMAIL</label>
                  <input id="cf-email" className="input" type="email" required maxLength={160} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="cf-subject">SUBJECT (OPTIONAL)</label>
                <input id="cf-subject" className="input" maxLength={140} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="cf-message">MESSAGE</label>
                <textarea id="cf-message" className="textarea" required minLength={10} maxLength={4000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Concise context = faster reply." />
              </div>
              {/* honeypot */}
              <div className="hp-field" aria-hidden="true">
                <label htmlFor="cf-company">Company</label>
                <input id="cf-company" tabIndex={-1} autoComplete="off" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
              <button className="btn btn-solid" type="submit" disabled={busy}>
                {busy ? "TRANSMITTING…" : "TRANSMIT MESSAGE"} <span aria-hidden="true">→</span>
              </button>
              {status.kind !== "idle" && (
                <div className={`form-status ${status.kind}`} role="status">{status.msg}</div>
              )}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
