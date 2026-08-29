import { useState } from "react";

import { api, resolveMediaUrl } from "../../lib/api";
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
      setStatus({ kind: "err", msg: "Please check your name, email, and message (at least 10 characters)." });
      return;
    }
    setBusy(true);
    try {
      await api.contact(form);
      setStatus({ kind: "ok", msg: "Message sent. I’ll get back to you." });
      unlock("signal");
      setForm({ name: "", email: "", subject: "", message: "", company: "" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setStatus({ kind: "err", msg });
    } finally {
      setBusy(false);
    }
  };

  const social = (label: string) => profile?.socials.find((s) => s.label.toLowerCase() === label.toLowerCase())?.url;

  return (
    <section className="section contact-section" id="contact" aria-label="Contact">
      <div className="container">
        <div className="section-head" data-reveal>
          <div>
            <span className="eyebrow">Contact</span>
            <h2 className="section-title">Let’s build something.</h2>
            <p className="section-sub">Have a product, a tricky system, or an opportunity in mind? I’d love to hear about it.</p>
          </div>
        </div>

        <div className="contact-grid">
          <div className="contact-info">
            <h3 data-reveal>Good work usually starts with a good conversation.</h3>
            <p data-reveal>
              You can reach me directly, or send a little context through the form. I’ll get back to you as soon as I can.
            </p>
            <div className="contact-channels" data-reveal>
              <a className="contact-channel" href={`mailto:${profile?.email ?? "harshap17058@gmail.com"}`}>
                <span className="cc-k">Email</span>
                <span className="cc-v">{profile?.email ?? "harshap17058@gmail.com"}</span>
              </a>
              <a className="contact-channel" href={social("linkedin") ?? "https://www.linkedin.com/in/harshpandeyz/"} target="_blank" rel="noopener noreferrer">
                <span className="cc-k">LinkedIn</span>
                <span className="cc-v">/in/harshpandeyz</span>
              </a>
              <a className="contact-channel" href={social("github") ?? "https://github.com/harshpandeyz"} target="_blank" rel="noopener noreferrer">
                <span className="cc-k">GitHub</span>
                <span className="cc-v">@harshpandeyz</span>
              </a>
              <a className="contact-channel" href={resolveMediaUrl(profile?.resumeUrl ?? "/files/HARSH-RESUME.pdf")} target="_blank" rel="noopener noreferrer">
                <span className="cc-k">Résumé</span>
                <span className="cc-v">Download PDF ↓</span>
              </a>
            </div>
          </div>

          <form className="contact-form brackets" onSubmit={submit} data-reveal noValidate>
            <div className="fields">
              <div className="row">
                <div className="field">
                  <label htmlFor="cf-name">Name</label>
                  <input id="cf-name" className="input" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
                </div>
                <div className="field">
                  <label htmlFor="cf-email">Email</label>
                  <input id="cf-email" className="input" type="email" required maxLength={160} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="cf-subject">Subject <span>(optional)</span></label>
                <input id="cf-subject" className="input" maxLength={140} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="cf-message">Message</label>
                <textarea id="cf-message" className="textarea" required minLength={10} maxLength={4000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Concise context = faster reply." />
              </div>
              {/* honeypot */}
              <div className="hp-field" aria-hidden="true">
                <label htmlFor="cf-company">Company</label>
                <input id="cf-company" tabIndex={-1} autoComplete="off" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
              <button className="btn btn-solid" type="submit" disabled={busy}>
                {busy ? "Sending…" : "Send message"} <span aria-hidden="true">↗</span>
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
