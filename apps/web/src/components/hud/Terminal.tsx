import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../../lib/api";

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
  const navigate = useNavigate();

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 40);
  }, [open]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [lines]);

  if (!open) return null;

  const exec = (raw: string) => {
    const cmd = raw.trim().toLowerCase();
    const out: Line[] = [{ kind: "cmd", text: raw }];
    const go = (path: string) => {
      onClose();
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
        window.open("/files/HARSH-RESUME.pdf", "_blank", "noopener");
        break;
      case "contact":
        out.push({ kind: "resp", text: "opening communication interface…" });
        go("/#contact");
        break;
      case "chat":
        out.push({ kind: "resp", text: "waking the intelligence core…" });
        window.dispatchEvent(new CustomEvent("hp:open-chat"));
        onClose();
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
        onClose();
        break;
      default:
        out.push({ kind: "err", text: `command not found: ${cmd} — try 'help'` });
    }
    setLines((l) => [...l, ...out]);
    setInput("");
  };

  return (
    <div className="terminal" role="dialog" aria-label="System terminal" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="term-bar">
        <span>GUEST@HP-OS:~</span>
        <button className="chat-icon-btn" onClick={onClose}>CLOSE ✕</button>
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
