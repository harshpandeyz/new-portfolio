import { useEffect, useState } from "react";

import { api } from "../../lib/api";
import type { AuditLogEntry } from "@hp/shared";
import { ErrorNote } from "./fields";

export function AuditAdmin() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.admin.audit(page).then((r) => { setLogs(r.logs); setTotal(r.total); }).catch((e) => setError(e.message));
  }, [page]);

  const pages = Math.max(1, Math.ceil(total / 50));

  return (
    <>
      <div className="admin-head">
        <h1>Audit Log ({total})</h1>
        <div className="actions">
          <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← PREV</button>
          <span className="mono mono-dim" style={{ alignSelf: "center" }}>{page}/{pages}</span>
          <button className="btn btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>NEXT →</button>
        </div>
      </div>
      <ErrorNote error={error} />

      <div className="admin-table">
        <div>
          {logs.map((l) => (
            <div className="audit-entry" key={l.id}>
              <span className="a-action">{l.action}</span>
              <span style={{ color: "var(--muted)" }}>{l.entity}{l.entityId ? `#${l.entityId.slice(-6)}` : ""}</span>
              <span style={{ color: "var(--dim)" }}>{l.actor}</span>
              <span className="a-meta">
                {new Date(l.createdAt).toLocaleString()}{l.ip ? ` · ${l.ip}` : ""}
              </span>
            </div>
          ))}
          {logs.length === 0 && <div style={{ padding: 30, textAlign: "center" }}><span className="mono mono-dim">NO ENTRIES</span></div>}
        </div>
      </div>
    </>
  );
}
