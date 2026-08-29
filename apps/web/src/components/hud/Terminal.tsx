import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, resolveMediaUrl } from "../../lib/api";

interface TerminalProps {
  open: boolean;
  onClose: () => void;
}

interface Line {
  kind: "cmd" | "resp" | "sys" | "err";
  text: string;
}

const HELP = `AVAILABLE COMMANDS
  help          this list
  whoami        operator identity
  projects      list project systems
  skills        capability summary
  certificates  credential count
  github        open repository hub
  resume        download resume
  contact       communication channels
  chat          open HARSH AI
  clear         clear terminal
  sudo          …try it`;

export function Terminal({ open, onClose }: TerminalProps) {
  const [lines, setLines] = useState<Line[]>([
    { kind: "sys", text: "HP//OS TERMINAL v3.0 — type 'help' for commands" },
  ]);
  const [input, setInput] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const navigate = useNavigate();
  onCloseRef.current = onClose;

  const closeTerminal = useCallback(() => {
    onCloseRef.current();
    window.setTimeout(() => previousFocusRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    document.body.classList.add("no-scroll");
    window.setTimeout(() => inputRef.current?.focus(), 40);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeTerminal();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = terminalRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), a[href]");
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
      document.body.classList.remove("no-scroll");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeTerminal, open]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [lines]);

  if (!open) return null;

  const exec = (raw: string) => {
    const cmd = raw.trim().toLowerCase();
    const out: Line[] = [{ kind: "cmd", text: raw }];
    const go = (path: string) => {
      closeTerminal();
      window.setTimeout(() => navigate(path), 80);
    };

    switch (cmd) {
      case "":
        break;
      case "help":
        out.push({ kind: "resp", text: HELP });
        break;
      case "whoami":
        out.push({ kind: "resp", text: "guest@hp-os — visitor session. clearance level: PUBLIC." });
        break;
      case "projects":
        out.push({ kind: "resp", text: "loading project constellation…" });
        go("/#projects");
        break;
      case "skills":
        out.push({ kind: "resp", text: "opening engineering core…" });
        go("/#core");
        break;
      case "certificates":
        out.push({ kind: "resp", text: "opening credential archive…" });
        go("/#credentials");
        break;
      case "github":
        out.push({ kind: "resp", text: "github.com/harshpandeyz" });
        window.open("https://github.com/harshpandeyz", "_blank", "noopener");
        break;
      case "resume":
        out.push({ kind: "resp", text: "downloading HARSH-RESUME.pdf…" });
        window.open(resolveMediaUrl("/files/HARSH-RESUME.pdf"), "_blank", "noopener");
        break;
      case "contact":
        out.push({ kind: "resp", text: "opening communication interface…" });
        go("/#contact");
        break;
      case "chat":
        out.push({ kind: "resp", text: "waking the intelligence core…" });
        window.dispatchEvent(new CustomEvent("hp:open-chat"));
        closeTerminal();
        break;
      case "clear":
        setLines([]);
        setInput("");
        return;
      case "sudo":
        out.push({ kind: "err", text: "sudo: operator privileges required. nice try." });
        out.push({ kind: "sys", text: "hint: some doors open with Ctrl+Shift+H — but they still need a key." });
        break;
      case "exit":
        closeTerminal();
        break;
      default:
        out.push({ kind: "err", text: `command not found: ${cmd} — try 'help'` });
    }
    setLines((l) => [...l, ...out]);
    setInput("");
  };

  return (
    <div ref={terminalRef} className="terminal" role="dialog" aria-modal="true" aria-label="Advanced terminal">
      <div className="term-bar">
        <span>GUEST@HP-OS:~</span>
        <button className="chat-icon-btn" onClick={closeTerminal}>CLOSE ✕</button>
      </div>
      <div className="term-body" ref={bodyRef}>
        {lines.map((l, i) => (
          <div
            key={i}
            className={`term-line ${l.kind}`}
            dangerouslySetInnerHTML={{
              __html: l.text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'),
            }}
          />
        ))}
      </div>
      <form
        className="term-input-row"
        onSubmit={(e) => {
          e.preventDefault();
          exec(input);
        }}
      >
        <span className="p">❯</span>
        <input
          ref={inputRef}
          className="term-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Terminal command input"
          autoComplete="off"
          spellCheck={false}
        />
      </form>
    </div>
  );
}

export async function fetchTerminalGreeting(): Promise<string> {
  try {
    const stats = await api.stats();
    return `projects: ${stats.projects} · credentials: ${stats.certificates} · skills: ${stats.skills}`;
  } catch {
    return "system link degraded — running on cached state";
  }
}
