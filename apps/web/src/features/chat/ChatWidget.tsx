import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../../lib/api";
import { unlock } from "../../lib/achievements";
import type { ChatReply } from "@hp/shared";

interface Msg {
  role: "user" | "ai";
  text: string;
  reply?: ChatReply;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener("hp:open-chat", openChat);
    return () => window.removeEventListener("hp:open-chat", openChat);
  }, []);

  useEffect(() => {
    if (open && suggestions.length === 0) {
      api.chatSuggestions().then((r) => setSuggestions(r.suggestions.slice(0, 5))).catch(() => undefined);
    }
    if (open) window.setTimeout(() => inputRef.current?.focus(), 60);
  }, [open, suggestions.length]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    unlock("ai");
    try {
      const reply = await api.chat(q);
      setMessages((m) => [...m, { role: "ai", text: reply.answer, reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "ai", text: "The intelligence core is unreachable right now. Retry in a moment." },
      ]);
    } finally {
      setBusy(false);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleLink = (href: string) => {
    setOpen(false);
    if (href.startsWith("/#")) {
      const id = href.slice(2);
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 80);
    } else if (href.startsWith("/")) {
      navigate(href);
    } else {
      window.open(href, "_blank", "noopener");
    }
  };

  return (
    <>
      {!open && (
        <button className="chat-fab" onClick={() => setOpen(true)} aria-label="Open HARSH AI assistant">
          <span className="pulse" aria-hidden="true" />
          <span className="label">ASK HARSH AI</span>
          <span aria-hidden="true">◈</span>
        </button>
      )}

      {open && (
        <div className="chat-panel" role="dialog" aria-label="HARSH AI assistant">
          <div className="chat-head">
            <div className="ai-orb" aria-hidden="true" />
            <div>
              <div className="ai-name">HARSH AI</div>
              <div className="ai-status">KNOWLEDGE CORE ONLINE</div>
            </div>
            <div className="ai-actions">
              {messages.length > 0 && (
                <button className="chat-icon-btn" onClick={() => setMessages([])} aria-label="Clear conversation">CLEAR</button>
              )}
              <button className="chat-icon-btn" onClick={() => setOpen(false)} aria-label="Close assistant">✕</button>
            </div>
          </div>

          <div className="chat-body" ref={bodyRef} aria-live="polite">
            {messages.length === 0 && (
              <div className="msg msg-ai">
                <div className="msg-bubble">
                  HARSH AI online. I answer from Harsh's verified portfolio knowledge base — projects,
                  skills, education, credentials, contact. I don't guess.
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div className={`msg ${m.role === "user" ? "msg-user" : "msg-ai"}`} key={i}>
                <div className="msg-bubble">{m.text}</div>
                {m.reply && (
                  <>
                    {(m.reply.sources.length > 0 || m.reply.confidence !== "UNKNOWN") && (
                      <div className="msg-meta">
                        {m.reply.confidence !== "UNKNOWN" && (
                          <span className={`msg-confidence ${m.reply.confidence}`}>{m.reply.confidence}</span>
                        )}
                        {m.reply.sources.slice(0, 3).map((s, si) => (
                          <span className="msg-source" key={si}>SRC · {s.label}</span>
                        ))}
                      </div>
                    )}
                    {m.reply.links.length > 0 && (
                      <div className="msg-links">
                        {m.reply.links.map((l, li) => (
                          <button className="msg-link" key={li} onClick={() => handleLink(l.href)}>→ {l.label}</button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            {busy && (
              <div className="msg msg-ai">
                <div className="typing" aria-label="Assistant is typing"><i /><i /><i /></div>
              </div>
            )}
          </div>

          {messages.length === 0 && suggestions.length > 0 && (
            <div className="chat-suggest">
              {suggestions.map((s) => (
                <button className="chat-suggest-btn" key={s} onClick={() => void send(s)}>{s}</button>
              ))}
            </div>
          )}

          <form
            className="chat-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <input
              ref={inputRef}
              className="chat-input"
              placeholder="Ask about projects, skills, education…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Message HARSH AI"
              maxLength={600}
            />
            <button className="chat-send" type="submit" disabled={busy || !input.trim()} aria-label="Send">➤</button>
          </form>
          <div className="chat-disclaimer">RETRIEVAL-BACKED · SOURCES CITED · NO HALLUCINATED FACTS</div>
        </div>
      )}
    </>
  );
}
