import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { api } from "../../lib/api";
import { unlock } from "../../lib/achievements";
import { useDialogLifecycle } from "../../hooks/useDialogLifecycle";
import type { ChatReply } from "@hp/shared";
import { useData } from "../../lib/data";
import { scrollBehavior } from "../../lib/motion";
import "./chat.css";

interface Msg {
  role: "user" | "ai";
  text: string;
  reply?: ChatReply;
  retry?: string;
}

interface ChatWidgetProps {
  openSignal: number;
  launcherRef: { current: HTMLButtonElement | null };
  onOpenChange: (open: boolean) => void;
}

export function ChatWidget({ openSignal, launcherRef, onOpenChange }: ChatWidgetProps) {
  const { publicSettings } = useData();
  const enabled = publicSettings?.chatEnabled !== false;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatControllerRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const openChat = useCallback(() => {
    setOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setOpen(false);
  }, []);

  const restoreFallback = useCallback(() => launcherRef.current, [launcherRef]);
  useDialogLifecycle(dialogRef, open && enabled, closeChat, undefined, undefined, restoreFallback);

  useEffect(() => {
    if (openSignal > 0) openChat();
  }, [openSignal, openChat]);

  useEffect(() => { onOpenChange(open); }, [open, onOpenChange]);

  useEffect(() => {
    if (enabled && open && suggestions.length === 0) {
      api.chatSuggestions().then((r) => setSuggestions(r.suggestions.slice(0, 5))).catch(() => undefined);
    }
    if (open) window.setTimeout(() => inputRef.current?.focus(), 60);
  }, [enabled, open, suggestions.length]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: scrollBehavior() });
  }, [messages, busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
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
    const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: scrollBehavior() });
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

  return enabled ? (
    <>
      {open && (
        <div ref={dialogRef} className="chat-panel" role="dialog" aria-modal="true" aria-label="Ask Harsh">
          <div className="chat-head">
            <div className="ai-orb" aria-hidden="true" />
            <div>
              <div className="ai-name">Ask Harsh</div>
              <div className="ai-status">Grounded in the portfolio</div>
            </div>
            <div className="ai-actions">
              {messages.length > 0 && (
                <button className="chat-icon-btn" onClick={() => setMessages([])} aria-label="Clear conversation">
                  Clear
                </button>
              )}
              <button className="chat-icon-btn" onClick={closeChat} aria-label="Close assistant">✕</button>
            </div>
          </div>

          <div className="chat-body" ref={bodyRef} aria-live="polite">
            {messages.length === 0 && (
              <div className="msg msg-ai">
                <div className="msg-bubble">
                  Hi — ask me about Harsh's work, skills, education, or the way a project was built. Answers stay grounded in the portfolio.
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
                        {m.reply.sources.slice(0, 3).map((source, index) => (
                          <span className="msg-source" key={index}>From {source.label}</span>
                        ))}
                      </div>
                    )}
                    {m.reply.links.length > 0 && (
                      <div className="msg-links">
                        {m.reply.links.map((link, index) => (
                          <button className="msg-link" key={index} onClick={() => handleLink(link.href)}>→ {link.label}</button>
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
              {suggestions.map((suggestion) => (
                <button className="chat-suggest-btn" key={suggestion} onClick={() => void send(suggestion)}>{suggestion}</button>
              ))}
            </div>
          )}

          <form
            className="chat-input-row"
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
          >
            <input
              ref={inputRef}
              className="chat-input"
              placeholder="Ask about projects, skills…"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              aria-label="Message Ask Harsh"
              maxLength={600}
            />
            <button className="chat-send" type="submit" disabled={busy || !input.trim()} aria-label="Send">➤</button>
          </form>
          <div className="chat-disclaimer">Answers are based on Harsh's portfolio</div>
        </div>
      )}
    </>
  ) : null;
}
