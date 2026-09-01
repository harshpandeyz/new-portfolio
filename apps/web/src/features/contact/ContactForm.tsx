import { useRef, useState } from "react";

import { api } from "../../lib/api";
import { unlock } from "../../lib/achievements";
import { contactSchema } from "@hp/shared";
import { Button } from "../../components/ui/Button";
import { StatusMessage } from "../../components/ui/StatusMessage";

const EMPTY = { name: "", email: "", subject: "", message: "", company: "" };

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
        <p>Thanks — I'll get back to you soon.</p>
        <Button onClick={() => { setForm(EMPTY); setState("idle"); }}>Send another message</Button>
      </div>
    );
  }

  return (
    <form className="contact-form brackets" onSubmit={submit} noValidate>
      <div className="fields">
        <div className="row">
          <div className="field">
            <label htmlFor="cf-name">Name</label>
            <input id="cf-name" className={`input${fieldErrors.name ? " input-err" : ""}`} required aria-required="true" aria-describedby={fieldErrors.name ? "cf-name-err" : undefined} maxLength={80} value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
            {fieldErrors.name && <span className="field-error" id="cf-name-err" role="alert">{fieldErrors.name}</span>}
          </div>
          <div className="field">
            <label htmlFor="cf-email">Email</label>
            <input id="cf-email" className={`input${fieldErrors.email ? " input-err" : ""}`} type="email" required aria-required="true" aria-describedby={fieldErrors.email ? "cf-email-err" : undefined} maxLength={160} value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
            {fieldErrors.email && <span className="field-error" id="cf-email-err" role="alert">{fieldErrors.email}</span>}
          </div>
        </div>
        <div className="field">
          <label htmlFor="cf-subject">Subject <span>(optional)</span></label>
          <input id="cf-subject" className="input" maxLength={140} value={form.subject} onChange={(e) => set("subject", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cf-message">Message</label>
          <textarea id="cf-message" className={`textarea${fieldErrors.message ? " input-err" : ""}`} required aria-required="true" aria-describedby={fieldErrors.message ? "cf-message-err" : undefined} minLength={10} maxLength={4000} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="Concise context = faster reply." />
          {fieldErrors.message && <span className="field-error" id="cf-message-err" role="alert">{fieldErrors.message}</span>}
        </div>
        {/* honeypot */}
        <div className="hp-field" aria-hidden="true">
          <label htmlFor="cf-company">Company</label>
          <input id="cf-company" tabIndex={-1} autoComplete="off" value={form.company} onChange={(e) => set("company", e.target.value)} />
        </div>
        <Button variant="primary" type="submit" disabled={state === "busy"}>
          {state === "busy" ? "Sending…" : "Send message"}
        </Button>
        {state === "err" && message && <StatusMessage kind="err">{message}</StatusMessage>}
      </div>
    </form>
  );
}