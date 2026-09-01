import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { api } from "../../lib/api";
import { unlock } from "../../lib/achievements";
import { useScrollLock } from "../../hooks/useScrollLock";
import type { ChatReply } from "@hp/shared";

interface Msg {
  role: "user" | "ai";
  text: string;
  reply?: ChatReply;
  retry?: string;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const chatControllerRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  useScrollLock(open);

  const openChat = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => {
      const target = previousFocusRef.current?.isConnected ? previousFocusRef.current : fabRef.current;
      target?.focus();
    }, 0);
  }, []);

  useEffect(() => {
    window.addEventListener("hp:open-chat", openChat);
    return () => window.removeEventListener("hp:open-chat", openChat);
  }, [openChat]);

  useEffect(() => {
    if (open && suggestions.length === 0) {
      api.chatSuggestions().then((r) => setSuggestions(r.suggestions.slice(0, 5))).catch(() => undefined);
    }
    if (open) window.setTimeout(() => inputRef.current?.focus(), 60);
  }, [open, suggestions.length]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeChat();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled), a[href]",
      );
      if (!focusables?.length) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeChat, open]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    // Cancel any in-flight chat request to prevent stale overwrites.
    chatControllerRef.current?.abort();
    const controller = new AbortController();
    chatControllerRef.current = controller;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    unlock("ai");
    try {
      const reply = await api.chat(q, controller.signal);
      if (!controller.signal.aborted) {
        setMessages((m) => [...m, { role: "ai", text: reply.answer, reply }]);
      }
    } catch {
      if (!controller.signal.aborted) {
        setMessages((m) => [
          ...m,
          { role: "ai", text: "Something went wrong. Please try again.", retry: q },
        ]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        window.setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
  };

  useEffect(() => {
    return () => {
      chatControllerRef.current?.abort();
    };
  }, []);

  const handleLink = (href: string) => {
    closeChat();
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
    if (href.startsWith("/#")) {
      const id = href.slice(2);
      if (location.pathname !== "/") {
        navigate(`/#${id}`);
        window.setTimeout(() => scrollToId(id), 220);
      } else {
        window.setTimeout(() => scrollToId(id), 80);
      }
    } else if (href.startsWith("#")) {
      const id = href.slice(1);
      if (location.pathname !== "/") {
        navigate(`/#${id}`);
        window.setTimeout(() => scrollToId(id), 220);
      } else {
        window.setTimeout(() => scrollToId(id), 80);
      }
    } else if (href.startsWith("/")) {
      navigate(href);
    } else {
      window.open(href, "_blank", "noopener");
    }
  };

  return (
    <>
      {!open && (
        <button ref={fabRef} className="chat-fab" onClick={openChat} aria-label="Ask Harsh">
          <span className="pulse" aria-hidden="true" />
          <span className="label">Ask Harsh</span>
          <span aria-hidden="true">✦</span>
        </button>
      )}

      {open && (
        <div ref={dialogRef} className="chat-panel" role="dialog" aria-modal="true" aria-label="Ask Harsh">
          <div className="chat-head">
            <div className="ai-orb" aria-hidden="true" />
            <div>
              <div className="ai-name">Ask Harsh</div>
              <div className="ai-status">A quick way to learn more</div>
            </div>
            <div className="ai-actions">
              {messages.length > 0 && (
                <button className="chat-icon-btn" onClick={() => setMessages([])} aria-label="Clear conversation">Clear</button>
              )}
              <button className="chat-icon-btn" onClick={closeChat} aria-label="Close assistant">✕</button>
            </div>
          </div>

          <div className="chat-body" ref={bodyRef} aria-live="polite">
            {messages.length === 0 && (
              <div className="msg msg-ai">
                <div className="msg-bubble">
                  Hi — ask me about Harsh's work, skills, education, or the way a project was built.
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
                          <span className="msg-source" key={si}>From {s.label}</span>
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
                {m.retry && (
                  <button className="msg-retry" onClick={() => void send(m.retry!)}>Try again</button>
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
              placeholder="Ask about projects, skills…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Message Ask Harsh"
              maxLength={600}
            />
            <button className="chat-send" type="submit" disabled={busy || !input.trim()} aria-label="Send">➤</button>
          </form>
          <div className="chat-disclaimer">Answers are based on Harsh's portfolio</div>
        </div>
      )}
    </>
  );
}