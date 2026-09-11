import { useRef, useState } from "react";

import { api } from "../../lib/api";
import { unlock } from "../../lib/achievements";
import { contactSchema } from "@hp/shared";
import { Button } from "../../components/ui/Button";
import { StatusMessage } from "../../components/ui/StatusMessage";
import { IconArrowRight } from "../../components/ui/icons";

const EMPTY = { name: "", email: "", subject: "", message: "", company: "" };
const MESSAGE_MAX = 4000;

const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const IconUser = () => (
  <svg {...iconProps}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconMailSmall = () => (
  <svg {...iconProps}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const IconSubject = () => (
  <svg {...iconProps}>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="14" y2="12" />
    <line x1="4" y1="18" x2="17" y2="18" />
  </svg>
);

const IconPen = () => (
  <svg {...iconProps}>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

const IconPlane = () => (
  <svg {...iconProps}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

const IconLock = () => (
  <svg {...iconProps}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

/** Contact form with explicit idle/loading/success/error states. */
export function ContactForm() {
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");
  const submittingRef = useRef(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = (key: keyof typeof EMPTY, value: string) => {
    setFieldErrors((e) => { const n = { ...e }; delete n[key]; return n; });
    setForm((f) => ({ ...f, [key]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    // Honeypot: bots fill the hidden field — pretend success without a request.
    if (form.company.trim()) {
      setState("ok");
      setMessage("");
      setForm(EMPTY);
      return;
    }
    submittingRef.current = true;
    setMessage("");
    setFieldErrors({});
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (typeof path === "string" && !errors[path]) {
          errors[path] = issue.message;
        }
      }
      setFieldErrors(errors);
      setState("err");
      setMessage("Please check your name, email, and message (at least 10 characters).");
      submittingRef.current = false;
      // Move focus to the first invalid field for keyboard/screen-reader users.
      const first = errors.name ? "cf-name" : errors.email ? "cf-email" : errors.message ? "cf-message" : null;
      if (first) window.setTimeout(() => document.getElementById(first)?.focus(), 30);
      return;
    }
    setState("busy");
    try {
      await api.contact(form);
      void api.track("contact_submit");
      unlock("signal");
      setState("ok");
      setMessage("");
      setForm(EMPTY);
    } catch (err) {
      setState("err");
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      submittingRef.current = false;
    }
  };

  if (state === "ok") {
    return (
      <div className="contact-success" role="status">
        <h3>Message sent.</h3>
        <p>Thanks — I&rsquo;ll get back to you soon.</p>
        <Button onClick={() => { setForm(EMPTY); setState("idle"); }}>Send another message</Button>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={submit} noValidate>
      <div className="fields">
        <div className="row">
          <div className="field">
            <label htmlFor="cf-name">Name</label>
            <div className="cf-control">
              <span className="cf-icon" aria-hidden="true"><IconUser /></span>
              <input id="cf-name" className={`input${fieldErrors.name ? " input-err" : ""}`} required aria-required="true" aria-describedby={fieldErrors.name ? "cf-name-err" : undefined} maxLength={80} value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" placeholder="Your name" />
            </div>
            {fieldErrors.name && <span className="field-error" id="cf-name-err" role="alert">{fieldErrors.name}</span>}
          </div>
          <div className="field">
            <label htmlFor="cf-email">Email</label>
            <div className="cf-control">
              <span className="cf-icon" aria-hidden="true"><IconMailSmall /></span>
              <input id="cf-email" className={`input${fieldErrors.email ? " input-err" : ""}`} type="email" required aria-required="true" aria-describedby={fieldErrors.email ? "cf-email-err" : undefined} maxLength={160} value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" placeholder="you@example.com" />
            </div>
            {fieldErrors.email && <span className="field-error" id="cf-email-err" role="alert">{fieldErrors.email}</span>}
          </div>
        </div>
        <div className="field">
          <label htmlFor="cf-subject">Subject <span>(optional)</span></label>
          <div className="cf-control">
            <span className="cf-icon" aria-hidden="true"><IconSubject /></span>
            <input id="cf-subject" className="input" maxLength={140} value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="e.g. Project inquiry, Internship, Collaboration…" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="cf-message">Message</label>
          <div className="cf-control">
            <span className="cf-icon cf-icon-top" aria-hidden="true"><IconPen /></span>
            <textarea id="cf-message" className={`textarea cf-message${fieldErrors.message ? " input-err" : ""}`} required aria-required="true" aria-describedby={fieldErrors.message ? "cf-message-err" : undefined} minLength={10} maxLength={MESSAGE_MAX} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="Tell me about your project, role, or idea…" />
          </div>
          {fieldErrors.message && <span className="field-error" id="cf-message-err" role="alert">{fieldErrors.message}</span>}
          <span className="cf-count" aria-live="off">{form.message.length}/{MESSAGE_MAX}</span>
        </div>
        {/* honeypot */}
        <div className="hp-field" aria-hidden="true">
          <label htmlFor="cf-company">Company</label>
          <input id="cf-company" tabIndex={-1} autoComplete="off" value={form.company} onChange={(e) => set("company", e.target.value)} />
        </div>
        <Button variant="primary" size="lg" type="submit" disabled={state === "busy"} className="cf-submit">
          <span className="cf-submit-plane" aria-hidden="true"><IconPlane /></span>
          {state === "busy" ? "Sending…" : "Send message"}
          <span className="cf-submit-arrow" aria-hidden="true"><IconArrowRight /></span>
        </Button>
        {state === "err" && message && <StatusMessage kind="err">{message}</StatusMessage>}
        <p className="cf-note">
          <span aria-hidden="true"><IconLock /></span>
          No spam. Just thoughtful conversations.
        </p>
      </div>
    </form>
  );
}
