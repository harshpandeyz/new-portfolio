import { useCallback, useEffect, useState } from "react";

import { api } from "../../lib/api";
import type { ContactMessage } from "@hp/shared";
import { ErrorNote } from "./fields";

const STATUSES = ["NEW", "READ", "REPLIED", "ARCHIVED"];

export function MessagesAdmin({ onChange }: { onChange: () => void }) {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);
  const [openMsg, setOpenMsg] = useState<ContactMessage | null>(null);

  const load = useCallback(() => {
    api.admin.messages({ status: statusFilter }).then((r) => setMessages(r.messages)).catch((e) => setError(e.message));
    onChange();
  }, [statusFilter, onChange]);

  useEffect(load, [load]);

  const setStatus = async (m: ContactMessage, status: string) => {
    await api.admin.setMessageStatus(m.id, status).catch((e) => setError(e.message));
    if (status === "READ" && openMsg?.id === m.id) setOpenMsg({ ...m, status });
    load();
  };

  const remove = async (m: ContactMessage) => {
    if (!window.confirm(`Delete message from ${m.name}?`)) return;
    await api.admin.deleteMessage(m.id).catch((e) => setError(e.message));
    setOpenMsg(null);
    load();
  };

  return (
    <>
      <div className="admin-head">
        <h1>Messages</h1>
        <div className="actions">
          {["ALL", ...STATUSES].map((s) => (
            <button key={s} className={`btn btn-sm${statusFilter === s ? " btn-solid" : " btn-ghost"}`} onClick={() => setStatusFilter(s)}>{s}</button>
          ))}
        </div>
      </div>
      <ErrorNote error={error} />

      <div className="admin-table">
        <table>
          <thead><tr><th>FROM</th><th>SUBJECT</th><th>STATUS</th><th>RECEIVED</th><th></th></tr></thead>
          <tbody>
            {messages.map((m) => (
              <tr key={m.id}>
                <td>
                  <span className="title">{m.name}</span>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--dim)" }}>{m.email}</div>
                </td>
                <td style={{ maxWidth: 320 }}>
                  <button style={{ textAlign: "left", color: "var(--text)" }} onClick={() => { setOpenMsg(m); if (m.status === "NEW") void setStatus(m, "READ"); }}>
                    {m.subject || m.message.slice(0, 60) + "…"}
                  </button>
                  {openMsg?.id === m.id && (
                    <div style={{ marginTop: 10, color: "var(--muted)", whiteSpace: "pre-wrap", fontSize: 13 }}>{m.message}</div>
                  )}
                </td>
                <td><span className={`msg-status ${m.status}`}>{m.status}</span></td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{new Date(m.createdAt).toLocaleString()}</td>
                <td>
                  <div className="row-actions">
                    {STATUSES.filter((s) => s !== m.status).slice(0, 2).map((s) => (
                      <button key={s} onClick={() => setStatus(m, s)}>{s === "REPLIED" ? "↩" : s === "ARCHIVED" ? "▣" : "✓"} {s}</button>
                    ))}
                    <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject ?? "your message")}`}>REPLY</a>
                    <button className="danger" onClick={() => remove(m)}>DEL</button>
                  </div>
                </td>
              </tr>
            ))}
            {messages.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 30 }}><span className="mono mono-dim">INBOX EMPTY</span></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
