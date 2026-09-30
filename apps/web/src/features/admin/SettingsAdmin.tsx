import { useCallback, useEffect, useState } from "react";

import { api } from "../../lib/api";
import type { SiteSettings } from "@hp/shared";
import { ConfirmDialog, ErrorState, PageHead, Switch, friendlyError, useToast } from "./ui";

const ROWS: { key: keyof SiteSettings; title: string; desc: string }[] = [
  { key: "chatEnabled", title: "Portfolio assistant", desc: "Allow visitors to ask the retrieval-backed assistant factual portfolio questions." },
  { key: "contactEnabled", title: "Contact form", desc: "Accept and store new contact messages in the private inbox." },
  { key: "analyticsEnabled", title: "Privacy-conscious analytics", desc: "Store aggregate event counters without fingerprinting or personal profiles." },
  { key: "maintenanceMode", title: "Maintenance mode", desc: "Show a visible public notice while keeping the portfolio browsable." },
];

const GROUPS = [
  { title: "Public experience", description: "Visitor-facing contact and availability controls.", keys: ["contactEnabled", "maintenanceMode"] as const },
  { title: "Assistant", description: "Grounded answers use the portfolio knowledge base and enabled providers.", keys: ["chatEnabled"] as const },
  { title: "Analytics & privacy", description: "Aggregate event counts only. No visitor profiles are stored.", keys: ["analyticsEnabled"] as const },
];

export function SettingsAdmin() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<keyof SiteSettings | null>(null);
  const [confirmMaintenance, setConfirmMaintenance] = useState(false);
  const { push } = useToast();

  const load = useCallback(async (signal?: AbortSignal) => {
    setError(null);
    try {
      const r = await api.admin.settings();
      if (!signal?.aborted) setSettings(r.settings);
    } catch (e) {
      if (!signal?.aborted) setError(friendlyError(e));
    }
  }, []);

  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load]);

  const apply = async (next: SiteSettings) => {
    const prev = settings;
    setSettings(next);
    try {
      const result = await api.admin.updateSettings(next);
      setSettings(result.settings);
      push({ kind: "success", title: "Settings updated" });
    } catch (e) {
      if (prev) setSettings(prev);
      push({ kind: "error", title: "Save failed", desc: friendlyError(e) });
    }
  };

  const toggle = (key: keyof SiteSettings, value: boolean) => {
    if (!settings || savingKey) return;
    if (key === "maintenanceMode" && value) {
      setConfirmMaintenance(true);
      return;
    }
    setSavingKey(key);
    void apply({ ...settings, [key]: value }).finally(() => setSavingKey(null));
  };

  if (error && !settings) {
    return (
      <>
        <PageHead title="Settings" desc="Safe, non-secret site controls." />
        <ErrorState message={error} onRetry={() => void load()} />
      </>
    );
  }
  if (!settings) {
    return (
      <>
        <PageHead title="Settings" desc="Safe, non-secret site controls." />
        <div className="ctl-card"><p className="ctl-muted">Loading settings…</p></div>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Settings"
        desc="Safe, non-secret feature controls. Changes apply instantly. Provider keys and session secrets remain environment-managed."
      />
      {error && <ErrorState message={error} />}
      <div className="ctl-settings-grid" aria-label="Site feature controls">
        {GROUPS.map((group) => <section className="ctl-settings-group" key={group.title}>
          <header><div><h2>{group.title}</h2><p>{group.description}</p></div></header>
          {group.keys.map((key) => {
            const row = ROWS.find((item) => item.key === key)!;
            return <Switch key={row.key} checked={settings[row.key]} disabled={savingKey !== null} onChange={(v) => toggle(row.key, v)} label={`${row.title}${savingKey === row.key ? " · saving…" : ""}`} desc={row.desc} />;
          })}
        </section>)}
      </div>
      <p className="ctl-settings-note">
        Turning the contact form or assistant off returns a polite 503 to visitors. Maintenance mode shows a banner but keeps every page browsable.
      </p>

      <ConfirmDialog
        open={confirmMaintenance}
        onClose={() => setConfirmMaintenance(false)}
        onConfirm={() => {
          setConfirmMaintenance(false);
          if (!settings) return;
          setSavingKey("maintenanceMode");
          void apply({ ...settings, maintenanceMode: true }).finally(() => setSavingKey(null));
        }}
        title="Enable maintenance mode?"
        description="Visitors will see a maintenance notice across the public site. Content stays browsable."
        confirmLabel="Enable maintenance"
        busy={savingKey === "maintenanceMode"}
      />
    </>
  );
}
