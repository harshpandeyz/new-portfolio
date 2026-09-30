import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "../../lib/api";
import type { AiProvider } from "@hp/shared";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useScrollLock } from "../../hooks/useScrollLock";
import { AdminIcon } from "./Icon";
import {
  Badge, ConfirmDialog, EmptyState, ErrorState, Field, PageHead,
  friendlyError, useToast,
} from "./ui";

const KINDS = [
  { value: "openai", label: "OpenAI", base: "https://api.openai.com/v1" },
  { value: "openrouter", label: "OpenRouter", base: "https://openrouter.ai/api/v1" },
  { value: "nvidia", label: "NVIDIA", base: "https://integrate.api.nvidia.com/v1" },
  { value: "groq", label: "Groq", base: "https://api.groq.com/openai/v1" },
  { value: "custom", label: "Custom (OpenAI-compatible)", base: "https://api.openai.com/v1" },
] as const;

interface FormState {
  name: string;
  kind: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  temperature: string;
  maxTokens: string;
  timeoutMs: string;
  systemPrompt: string;
  enabled: boolean;
  priority: string;
  isFallback: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  kind: "openrouter",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "",
  apiKey: "",
  temperature: "0.2",
  maxTokens: "500",
  timeoutMs: "20000",
  systemPrompt: "",
  enabled: true,
  priority: "0",
  isFallback: false,
};

function toForm(p?: AiProvider): FormState {
  if (!p) return EMPTY_FORM;
  return {
    name: p.name,
    kind: p.kind,
    baseUrl: p.baseUrl,
    model: p.model,
    apiKey: "",
    temperature: String(p.temperature),
    maxTokens: String(p.maxTokens),
    timeoutMs: String(p.timeoutMs),
    systemPrompt: p.systemPrompt ?? "",
    enabled: p.enabled,
    priority: String(p.priority),
    isFallback: p.isFallback,
  };
}

function healthTone(h: string): "green" | "red" | "neutral" | "gray" {
  if (h === "ok") return "green";
  if (h === "error") return "red";
  if (h === "disabled") return "neutral";
  return "gray";
}

export function AiProvidersAdmin() {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [envFallback, setEnvFallback] = useState<{ provider: string; model: string | null; configured: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AiProvider | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AiProvider | null>(null);
  const [rotateTarget, setRotateTarget] = useState<AiProvider | null>(null);
  const [rotateKey, setRotateKey] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const providerDialogRef = useRef<HTMLDivElement>(null);
  const rotateDialogRef = useRef<HTMLDivElement>(null);
  const closeProviderDialog = useCallback(() => setCreating(false), []);
  const closeRotateDialog = useCallback(() => setRotateTarget(null), []);
  useFocusTrap(providerDialogRef, creating, closeProviderDialog);
  useFocusTrap(rotateDialogRef, Boolean(rotateTarget), closeRotateDialog);
  useScrollLock(creating || Boolean(rotateTarget));
  const { push } = useToast();

  const load = useCallback(async (signal?: AbortSignal) => {
    setError(null);
    try {
      const r = await api.admin.aiProviders();
      if (signal?.aborted) return;
      setProviders(r.providers);
      setEnvFallback(r.envFallback);
    } catch (e) {
      if (!signal?.aborted) setError(friendlyError(e));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setCreating(true);
  };

  const openEdit = (p: AiProvider) => {
    setEditing(p);
    setForm(toForm(p));
    setFormError(null);
    setCreating(true);
  };

  const set = (k: keyof FormState, v: string | boolean) => {
    setForm((f) => {
      const next = { ...f, [k]: v } as FormState;
      if (k === "kind" && typeof v === "string") {
        const found = KINDS.find((x) => x.value === v);
        if (found && (!f.baseUrl || KINDS.some((x) => x.base === f.baseUrl))) next.baseUrl = found.base;
      }
      return next;
    });
  };

  const save = async () => {
    setFormError(null);
    if (!form.name.trim() || !form.baseUrl.trim() || !form.model.trim()) {
      setFormError("Name, base URL and model are required.");
      return;
    }
    if (!editing && !form.apiKey.trim()) {
      setFormError("An API key is required when creating a provider. It is encrypted server-side and never shown again.");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        kind: form.kind,
        baseUrl: form.baseUrl.trim(),
        model: form.model.trim(),
        temperature: Number(form.temperature) || 0,
        maxTokens: Math.max(32, Number(form.maxTokens) || 500),
        timeoutMs: Math.max(2000, Number(form.timeoutMs) || 20000),
        systemPrompt: form.systemPrompt.trim() || null,
        enabled: form.enabled,
        priority: Math.max(0, Number(form.priority) || 0),
        isFallback: form.isFallback,
      };
      if (form.apiKey.trim()) payload.apiKey = form.apiKey.trim();
      const result = editing
        ? await api.admin.updateAiProvider(editing.id, payload)
        : await api.admin.createAiProvider(payload);
      setProviders((list) => {
        if (editing) return list.map((x) => (x.id === editing.id ? result.provider : x));
        return [...list, result.provider].sort((a, b) => a.priority - b.priority);
      });
      setCreating(false);
      setEditing(null);
      push({ kind: "success", title: editing ? "Provider updated" : "Provider added", desc: "Keys are encrypted at rest and never exposed." });
    } catch (e) {
      setFormError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (p: AiProvider) => {
    setBusyId(p.id);
    try {
      const r = await api.admin.updateAiProvider(p.id, { enabled: !p.enabled });
      setProviders((list) => list.map((x) => (x.id === p.id ? r.provider : x)));
      push({ kind: "success", title: r.provider.enabled ? "Provider enabled" : "Provider disabled" });
    } catch (e) {
      push({ kind: "error", title: "Update failed", desc: friendlyError(e) });
    } finally {
      setBusyId(null);
    }
  };

  const test = async (p: AiProvider, mode: "connection" | "model") => {
    setTestingId(`${p.id}:${mode}`);
    try {
      const r = await api.admin.testAiProvider(p.id, mode);
      setProviders((list) => list.map((x) => (x.id === p.id ? r.provider : x)));
      push({ kind: "success", title: `${mode === "model" ? "Model test" : "Connection"} ok`, desc: `${r.latencyMs}ms${r.echo ? ` · ${r.echo.slice(0, 80)}` : ""}` });
    } catch (e) {
      push({ kind: "error", title: `${mode === "model" ? "Model test" : "Connection test"} failed`, desc: friendlyError(e) });
      void load();
    } finally {
      setTestingId(null);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await api.admin.deleteAiProvider(deleteTarget.id);
      setProviders((list) => list.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
      push({ kind: "success", title: "Provider deleted" });
    } catch (e) {
      push({ kind: "error", title: "Delete failed", desc: friendlyError(e) });
    } finally {
      setBusyId(null);
    }
  };

  const rotate = async () => {
    if (!rotateTarget || rotateKey.trim().length < 8) return;
    setBusyId(rotateTarget.id);
    try {
      const r = await api.admin.rotateAiProviderKey(rotateTarget.id, rotateKey.trim());
      setProviders((list) => list.map((x) => (x.id === rotateTarget.id ? r.provider : x)));
      setRotateTarget(null);
      setRotateKey("");
      push({ kind: "success", title: "Key rotated", desc: "Old key replaced. Test the provider to verify." });
    } catch (e) {
      push({ kind: "error", title: "Rotation failed", desc: friendlyError(e) });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <>
        <PageHead title="AI providers" desc="Configure the portfolio assistant's language models." />
        <div className="ctl-card"><p className="ctl-muted">Loading providers…</p></div>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="AI providers"
        desc={`${providers.length} configured · browser talks to backend, backend talks to provider · keys encrypted at rest, never exposed.`}
        actions={<button type="button" className="ctl-btn ctl-btn--primary ctl-btn--sm" onClick={openCreate}>Add provider</button>}
      />
      {error && <ErrorState message={error} onRetry={() => { setLoading(true); void load(); }} />}

      {envFallback && (
        <div className="ctl-ai-env">
          <div className="ctl-ai-env-head"><AdminIcon name="ai" size={17} /><b>Environment fallback</b>
            <Badge tone={envFallback.configured ? "green" : "gray"}>{envFallback.configured ? "CONFIGURED" : "NOT SET"}</Badge>
          </div>
          <p>{envFallback.provider}{envFallback.model ? ` · ${envFallback.model}` : ""}. Used when no database provider is enabled. Manage its secret in the server environment.</p>
        </div>
      )}

      {providers.length === 0 && !error ? (
        <EmptyState
          title="No AI providers yet"
          desc="Add an OpenAI-compatible provider (OpenRouter, NVIDIA, OpenAI, Groq or custom). Without one, the assistant answers deterministically from the knowledge base."
          action={<button type="button" className="ctl-btn ctl-btn--primary ctl-btn--sm" onClick={openCreate}>Add your first provider</button>}
        />
      ) : (
        <div className="ctl-ai-provider-list">
          {providers.map((p) => (
            <article key={p.id} className="ctl-ai-provider" aria-label={`AI provider ${p.name}`}>
                <div className="ctl-ai-provider-main">
                  <div className="ctl-ai-provider-title">
                    <AdminIcon name="ai" size={18} /><h2>{p.name}</h2><span className="ctl-ai-kind">{p.kind}</span>
                    <Badge tone={p.enabled ? "green" : "neutral"}>{p.enabled ? "ENABLED" : "DISABLED"}</Badge>
                    <Badge tone={healthTone(p.health)}>{p.health.toUpperCase()}</Badge>
                    {p.isFallback && <Badge tone="neutral">Fallback</Badge>}
                  </div>
                  <div className="ctl-ai-provider-model"><code>{p.model}</code><span>{p.baseUrl}</span>
                  </div>
                  <div className="ctl-ai-provider-facts">
                    <span>Credential <code>{p.hasKey ? (p.keyHint ?? "••••") : "Not configured"}</code></span>
                    <span>Priority {p.priority}</span><span>Timeout {Math.round(p.timeoutMs / 1000)}s</span>
                    {p.lastLatencyMs != null && <span>Last check {p.lastLatencyMs} ms</span>}
                  </div>
                  {p.lastError && <p className="ctl-ai-provider-error"><AdminIcon name="alert" size={14} />{p.lastError.slice(0, 180)}</p>}
                </div>
                <div className="ctl-ai-provider-actions">
                  <button type="button" className="ctl-btn ctl-btn--secondary ctl-btn--sm" disabled={testingId !== null} onClick={() => void test(p, "connection")}><AdminIcon name="activity" size={14} />{testingId === `${p.id}:connection` ? "Testing…" : "Test connection"}</button>
                  <button type="button" className="ctl-btn ctl-btn--ghost ctl-btn--sm" disabled={busyId === p.id} onClick={() => openEdit(p)}>Edit</button>
                  <details className="ctl-overflow-menu"><summary aria-label={`More actions for ${p.name}`}><AdminIcon name="more" size={17} /></summary><div>
                    <button type="button" disabled={testingId !== null} onClick={() => void test(p, "model")}>Test model</button>
                    <button type="button" disabled={busyId === p.id} onClick={() => void toggleEnabled(p)}>{p.enabled ? "Disable provider" : "Enable provider"}</button>
                    <button type="button" onClick={() => { setRotateTarget(p); setRotateKey(""); }}>Rotate key</button>
                    <button type="button" className="danger" onClick={() => setDeleteTarget(p)}>Delete provider</button>
                  </div></details>
                </div>
            </article>
          ))}
        </div>
      )}

      <p className="ctl-ai-note">
        Security: keys are AES-256-GCM encrypted with a server-side key, masked as {`****last4`} in this UI,
        never written to logs, analytics or audit records, and never sent to the browser except when you type a new one.
        Priority decides order; fallback providers are tried last. Reads require content access; writes require ADMIN.
      </p>

      {creating && (
        <div className="ctl-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setCreating(false)}>
          <div ref={providerDialogRef} role="dialog" aria-modal="true" aria-label={editing ? "Edit provider" : "Add provider"} className="ctl-dialog ctl-dialog--wide">
            <div className="ctl-dialog-head">
              <div>
                <h2>{editing ? `Edit ${editing.name}` : "Add provider"}</h2>
                <p>OpenAI-compatible /chat/completions. Works with OpenRouter, NVIDIA, OpenAI, Groq and custom endpoints.</p>
              </div>
              <button className="ctl-icon-btn" onClick={() => setCreating(false)} aria-label="Close dialog">×</button>
            </div>
            <div className="ctl-dialog-body ctl-ai-form">
              {formError && <ErrorState message={formError} />}
              <div className="ctl-ai-form-row ctl-ai-form-row--2">
                <Field label="Name" required>{(id) => <input id={id} className="ctl-input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="OpenRouter primary" maxLength={80} />}</Field>
                <Field label="Provider" required>{(id) => (
                  <select id={id} className="ctl-select" value={form.kind} onChange={(e) => set("kind", e.target.value)}>
                    {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                  </select>
                )}</Field>
              </div>
              <Field label="Base URL" required hint="Full origin + version path, e.g. https://openrouter.ai/api/v1">{(id) => <input id={id} className="ctl-input" value={form.baseUrl} onChange={(e) => set("baseUrl", e.target.value)} placeholder="https://…" inputMode="url" />}</Field>
              <div className="ctl-ai-form-row ctl-ai-form-row--2">
                <Field label="Model" required hint="e.g. meta-llama/llama-3.1-8b-instruct:free">{(id) => <input id={id} className="ctl-input" value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="model id" />}</Field>
                <Field label={editing ? "API key (leave blank to keep current)" : "API key"} required={!editing} hint="Encrypted on save, never displayed again.">{(id) => <input id={id} className="ctl-input" type="password" autoComplete="new-password" value={form.apiKey} onChange={(e) => set("apiKey", e.target.value)} placeholder={editing ? "••••••••" : "sk-…"} />}</Field>
              </div>
              <div className="ctl-ai-form-row ctl-ai-form-row--3">
                <Field label="Temperature" hint="0 – 2">{(id) => <input id={id} className="ctl-input" inputMode="decimal" value={form.temperature} onChange={(e) => set("temperature", e.target.value)} />}</Field>
                <Field label="Max tokens" hint="32 – 8000">{(id) => <input id={id} className="ctl-input" inputMode="numeric" value={form.maxTokens} onChange={(e) => set("maxTokens", e.target.value)} />}</Field>
                <Field label="Timeout (ms)" hint="2000 – 120000">{(id) => <input id={id} className="ctl-input" inputMode="numeric" value={form.timeoutMs} onChange={(e) => set("timeoutMs", e.target.value)} />}</Field>
              </div>
              <Field label="System prompt (optional)" hint="Overrides the default grounded-assistant prompt for this provider.">{(id) => <textarea id={id} className="ctl-textarea" rows={3} value={form.systemPrompt} onChange={(e) => set("systemPrompt", e.target.value)} placeholder="Leave blank for the default grounded prompt…" />}</Field>
              <div className="ctl-ai-form-flags">
                <label className="ctl-check"><input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} /> Enabled</label>
                <label className="ctl-check"><input type="checkbox" checked={form.isFallback} onChange={(e) => set("isFallback", e.target.checked)} /> Fallback (tried last)</label>
                <Field label="Priority (lower runs first)">{(id) => <input id={id} className="ctl-input ctl-ai-priority" inputMode="numeric" value={form.priority} onChange={(e) => set("priority", e.target.value)} />}</Field>
              </div>
            </div>
            <div className="ctl-dialog-foot">
              <button type="button" className="ctl-btn ctl-btn--ghost ctl-btn--sm" onClick={() => setCreating(false)}>Cancel</button>
              <button type="button" className="ctl-btn ctl-btn--primary ctl-btn--sm" disabled={saving} onClick={() => void save()}>
                {saving ? "Saving…" : editing ? "Save changes" : "Add provider"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void remove()}
        title={`Delete ${deleteTarget?.name ?? "provider"}?`}
        description="The encrypted key is destroyed with the record. The assistant falls back to remaining providers or the knowledge base."
        confirmLabel="Delete provider"
        busy={busyId === deleteTarget?.id}
      />

      {rotateTarget && (
        <div className="ctl-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setRotateTarget(null)}>
          <div ref={rotateDialogRef} role="dialog" aria-modal="true" aria-label="Rotate API key" className="ctl-dialog">
            <div className="ctl-dialog-head">
              <div>
                <h2>Rotate key — {rotateTarget.name}</h2>
                <p>Paste the new key. The old ciphertext is replaced immediately.</p>
              </div>
              <button className="ctl-icon-btn" onClick={() => setRotateTarget(null)} aria-label="Close dialog">×</button>
            </div>
            <div className="ctl-dialog-body">
              <Field label="New API key" required hint="Minimum 8 characters. Never logged or displayed.">{(id) => (
                <input id={id} className="ctl-input" type="password" autoComplete="new-password" value={rotateKey} onChange={(e) => setRotateKey(e.target.value)} placeholder="sk-…" />
              )}</Field>
            </div>
            <div className="ctl-dialog-foot">
              <button type="button" className="ctl-btn ctl-btn--ghost ctl-btn--sm" onClick={() => setRotateTarget(null)}>Cancel</button>
              <button type="button" className="ctl-btn ctl-btn--primary ctl-btn--sm" disabled={busyId === rotateTarget.id || rotateKey.trim().length < 8} onClick={() => void rotate()}>
                {busyId === rotateTarget.id ? "Rotating…" : "Rotate key"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
