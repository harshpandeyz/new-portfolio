import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { api } from "../../lib/api";
import { unlock } from "../../lib/achievements";
import { useScrollLock } from "../../hooks/useScrollLock";
import type { ChatReply } from "@hp/shared";
import { useData } from "../../lib/data";

interface Msg {
  role: "user" | "ai";
  text: string;
  reply?: ChatReply;
  retry?: string;
}

interface InterviewMsg {
  role: "ai" | "user";
  text: string;
}

type Tab = "ask" | "interview";

export function ChatWidget() {
  const { publicSettings } = useData();
  const enabled = publicSettings?.chatEnabled !== false;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("ask");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  // interview state
  const [iturns, setIturns] = useState<InterviewMsg[]>([]);
  const [ianswer, setIanswer] = useState("");
  const [ibusy, setIbusy] = useState(false);
  const [idone, setIdone] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const iInputRef = useRef<HTMLTextAreaElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const chatControllerRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  useScrollLock(open && enabled);

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
    if (enabled && open && tab === "ask" && suggestions.length === 0) {
      api.chatSuggestions().then((r) => setSuggestions(r.suggestions.slice(0, 5))).catch(() => undefined);
    }
    if (open) {
      window.setTimeout(() => {
        if (tab === "ask") inputRef.current?.focus();
        else iInputRef.current?.focus();
      }, 60);
    }
  }, [enabled, open, suggestions.length, tab]);

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
        "button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href]",
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
  }, [messages, busy, iturns, ibusy, tab]);

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

  const startInterview = async () => {
    if (ibusy) return;
    setIbusy(true);
    try {
      const r = await api.interview({ action: "start", history: iturns });
      const next: InterviewMsg[] = [];
      if (r.reaction) next.push({ role: "ai", text: r.reaction });
      if (r.question) next.push({ role: "ai", text: r.question });
      setIturns((t) => [...t, ...next]);
      setIdone(r.done);
    } catch {
      setIturns((t) => [...t, { role: "ai", text: "The interview room hit a snag — try starting again in a moment." }]);
    } finally {
      setIbusy(false);
      window.setTimeout(() => iInputRef.current?.focus(), 50);
    }
  };

  const sendInterviewAnswer = async () => {
    const a = ianswer.trim();
    if (!a || ibusy || idone) return;
    setIbusy(true);
    const withAnswer: InterviewMsg[] = [...iturns, { role: "user", text: a }];
    setIturns(withAnswer);
    setIanswer("");
    try {
      const r = await api.interview({ action: "answer", answer: a, history: withAnswer });
      const next: InterviewMsg[] = [];
      if (r.reaction) next.push({ role: "ai", text: r.reaction });
      if (r.question) next.push({ role: "ai", text: r.question });
      setIturns((t) => [...t, ...next]);
      setIdone(r.done);
    } catch {
      setIturns((t) => [...t, { role: "ai", text: "I missed that — could you say it once more?" }]);
      setIanswer(a);
    } finally {
      setIbusy(false);
      window.setTimeout(() => iInputRef.current?.focus(), 50);
    }
  };

  const endInterview = async () => {
    try {
      await api.interview({ action: "end", history: iturns });
    } catch {
      /* best effort */
    }
    setIdone(true);
    setIturns((t) => [...t, { role: "ai", text: "Thanks for the conversation — the case studies and recruiter view have everything we covered, with links." }]);
  };

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

  return enabled ? (
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
              <div className="ai-status">Grounded in the portfolio</div>
            </div>
            <div className="ai-actions">
              {(tab === "ask" ? messages.length > 0 : iturns.length > 0) && (
                <button
                  className="chat-icon-btn"
                  onClick={() => (tab === "ask" ? setMessages([]) : (setIturns([]), setIdone(false)))}
                  aria-label="Clear conversation"
                >
                  Clear
                </button>
              )}
              <button className="chat-icon-btn" onClick={closeChat} aria-label="Close assistant">✕</button>
            </div>
          </div>

          <div className="chat-tabs" role="tablist" aria-label="Assistant mode">
            <button
              role="tab"
              aria-selected={tab === "ask"}
              className={`chat-tab${tab === "ask" ? " active" : ""}`}
              onClick={() => setTab("ask")}
            >
              Ask
            </button>
            <button
              role="tab"
              aria-selected={tab === "interview"}
              className={`chat-tab${tab === "interview" ? " active" : ""}`}
              onClick={() => setTab("interview")}
            >
              Interview
            </button>
          </div>

          {tab === "ask" ? (
            <>
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
            </>
          ) : (
            <>
              <div className="chat-body" aria-live="polite">
                {iturns.length === 0 && (
                  <div className="msg msg-ai">
                    <div className="msg-bubble">
                      Interview mode: I'll ask one grounded question at a time about Harsh's real work and react to your answers. No scores, no rankings — just a focused conversation.
                    </div>
                  </div>
                )}
                {iturns.map((t, i) => (
                  <div className={`msg ${t.role === "user" ? "msg-user" : "msg-ai"}`} key={i}>
                    <div className="msg-bubble">{t.text}</div>
                  </div>
                ))}
                {ibusy && (
                  <div className="msg msg-ai">
                    <div className="typing" aria-label="Interviewer is thinking"><i /><i /><i /></div>
                  </div>
                )}
              </div>
              {iturns.length === 0 ? (
                <div style={{ padding: "0 17px 14px" }}>
                  <button className="chat-start-btn" onClick={() => void startInterview()} disabled={ibusy}>
                    {ibusy ? "Starting…" : "Start interview"}
                  </button>
                </div>
              ) : (
                <>
                  <form
                    className="chat-input-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void sendInterviewAnswer();
                    }}
                  >
                    <textarea
                      ref={iInputRef}
                      className="chat-input chat-textarea"
                      placeholder={idone ? "Interview wrapped — start a new one with Clear." : "Your answer…"}
                      value={ianswer}
                      onChange={(e) => setIanswer(e.target.value)}
                      aria-label="Your interview answer"
                      maxLength={4000}
                      rows={2}
                      disabled={idone || ibusy}
                    />
                    <button className="chat-send" type="submit" disabled={ibusy || idone || !ianswer.trim()} aria-label="Send answer">➤</button>
                  </form>
                  {!idone && iturns.length > 0 && (
                    <div style={{ padding: "0 17px 10px", textAlign: "right" }}>
                      <button className="msg-retry" onClick={() => void endInterview()}>End interview</button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          <div className="chat-disclaimer">Answers are based on Harsh's portfolio</div>
        </div>
      )}
    </>
  ) : null;
}
