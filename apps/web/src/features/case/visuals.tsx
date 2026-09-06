import { useEffect, useRef, type ReactNode } from "react";

/** Scroll reveal — CSS transition via IntersectionObserver, reduced-motion safe. */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { el.classList.add("is-in"); io.disconnect(); }
      }),
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`cs-rv ${className}`} style={delay ? { transitionDelay: `${delay}s` } : undefined}>{children}</div>;
}

export function CaseSection({ num, kick, title, lede, children, id }: { num: string; kick: string; title: string; lede?: string; children: ReactNode; id?: string }) {
  return (
    <section className="cs-sec" id={id} aria-label={title}>
      <Reveal>
        <div className="cs-sec-head"><span className="cs-sec-num">{num}</span><span className="cs-sec-kick">{kick}</span></div>
        <h2 className="cs-sec-title">{title}</h2>
        {lede && <p className="cs-sec-lede">{lede}</p>}
      </Reveal>
      <Reveal>{children}</Reveal>
    </section>
  );
}

export function Canvas({ kicker, right, children, caption, dark }: { kicker: ReactNode; right?: ReactNode; children: ReactNode; caption?: ReactNode; dark?: boolean }) {
  return (
    <div className={`cs-canvas${dark ? " cs-dark" : ""}`}>
      <div className="cs-canvas-head"><b>◆</b><span>{kicker}</span><span className="r">{right}</span></div>
      <div className="cs-canvas-body">{children}</div>
      {caption && <div className="cs-canvas-cap">{caption}</div>}
    </div>
  );
}

export function HScroll({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="cs-scroll" role="img" aria-label={label} tabIndex={0}>
      <div className="cs-scroll-inner">{children}</div>
    </div>
  );
}

export interface FlowNode { label: string; sub: string; icon?: string; hot?: boolean; state?: boolean }

export function FlowIcon({ kind }: { kind?: string }) {
  const c = { width: 15, height: 15, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.35, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "camera": return (<svg {...c} aria-hidden="true"><rect x="2.5" y="5" width="8.5" height="6.5" rx="1.2" /><path d="M11 7.2 13.4 5.6v5l-2.4-1.5" /><circle cx="6.8" cy="8.2" r="1.7" /></svg>);
    case "brain": return (<svg {...c} aria-hidden="true"><path d="M8 2.6c1-.9 2.9-.8 3.5 1 .9-.4 1.8.2 1.7 1.1.8.4.9 1.5.3 2.1.6.8 0 1.9-1 1.9" /><path d="M8 2.6c-1-.9-2.9-.8-3.5 1-.9-.4-1.8.2-1.7 1.1-.8.4-.9 1.5-.3 2.1-.6.8 0 1.9 1 1.9" /><path d="M8 2.6V6M3.5 9.4h3v2h3v-1.8" /></svg>);
    case "alert": return (<svg {...c} aria-hidden="true"><path d="M8 2.4 13.6 12.2H2.4L8 2.4z" /><path d="M8 7v3M8 11.2h.1" /></svg>);
    case "evidence": return (<svg {...c} aria-hidden="true"><rect x="3" y="7" width="10" height="6.5" rx="1.2" /><path d="M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7" /><circle cx="8" cy="10.2" r="1" fill="currentColor" stroke="none" /></svg>);
    case "ledger": return (<svg {...c} aria-hidden="true"><path d="M4 3.5h5.2a2 2 0 0 1 2 2v1H6a2 2 0 0 0-2 2v3.5" /><rect x="4" y="8.5" width="7.2" height="4" rx="1" /><path d="M5.8 10.5h3.6M5.8 12h3.6" /></svg>);
    case "attest": case "shield": return (<svg {...c} aria-hidden="true"><path d="M8 2 13 4v3.6C13 10.8 10.6 13.2 8 14 5.4 13.2 3 10.8 3 7.6V4L8 2z" /><path d="M6.2 8 7.6 9.4 9.9 6.6" /></svg>);
    case "documents": return (<svg {...c} aria-hidden="true"><path d="M4.5 2.5h5l3 3v8H4.5z" /><path d="M9.5 2.5v3h3" /><path d="M6 7h4M6 9.5h4M6 12h2.5" /></svg>);
    case "ingest": return (<svg {...c} aria-hidden="true"><rect x="3" y="7" width="10" height="6" rx="1" /><path d="M5 7V5.2a3 3 0 0 1 6 0V7" /></svg>);
    case "search": return (<svg {...c} aria-hidden="true"><circle cx="7" cy="7" r="4" /><path d="M10.2 10.2 13 13" /></svg>);
    case "chat": return (<svg {...c} aria-hidden="true"><path d="M3 4.2a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 13 4.2v5.2a1.5 1.5 0 0 1-1.5 1.5H6.2L3 12.8V4.2z" /></svg>);
    case "user": return (<svg {...c} aria-hidden="true"><circle cx="8" cy="5.2" r="2.3" /><path d="M3.2 13c.6-2.2 2.4-3.6 4.8-3.6s4.2 1.4 4.8 3.6" /></svg>);
    case "auth": return (<svg {...c} aria-hidden="true"><path d="M8 2 12.8 4.2v3.6C12.8 10.8 10.7 13.1 8 14 5.3 13.1 3.2 10.8 3.2 7.8V4.2L8 2z" /></svg>);
    case "api": return (<svg {...c} aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="3.2" rx="1" /><rect x="2.5" y="9.5" width="11" height="3.2" rx="1" /></svg>);
    case "web": return (<svg {...c} aria-hidden="true"><rect x="2" y="3" width="12" height="9" rx="1.2" /><path d="M2 5.5h12" /></svg>);
    default: return (<svg {...c} aria-hidden="true"><circle cx="8" cy="8" r="5" /><path d="M8 5.2v3.4l2 1.2" /></svg>);
  }
}

export function PipeFlow({ nodes, dark }: { nodes: FlowNode[]; dark?: boolean }) {
  const label = nodes.map((n) => n.label).join(" → ");
  return (
    <HScroll label={`Flow: ${label}`}>
      <div className="cs-flow" aria-hidden="true">
        {nodes.map((n, i) => (
          <div key={`${n.label}-${i}`} style={{ display: "contents" }}>
            <div className={`${dark ? "cs-dnode" : "cs-node"}${n.hot ? " is-hot" : ""}`}>
              {n.state && <span className="st" />}
              {!dark && <span className="ic"><FlowIcon kind={n.icon} /></span>}
              <b>{n.label}</b>
              <span>{n.sub}</span>
            </div>
            {i < nodes.length - 1 && <span className="cs-link flowline" />}
          </div>
        ))}
      </div>
      <ol className="sr-only">{nodes.map((n, i) => <li key={i}>{n.label}: {n.sub}</li>)}</ol>
    </HScroll>
  );
}

export interface Decision { title: string; why: string; tag: string }

export function DecisionCards({ items }: { items: Decision[] }) {
  return (
    <div className="cs-decisions">
      {items.map((d, i) => (
        <div key={i} className="cs-dec">
          <span className="n">DECISION {String(i + 1).padStart(2, "0")}</span>
          <p className="t">{d.title}</p>
          <p className="w">{d.why}</p>
          <span className="tg">{d.tag}</span>
        </div>
      ))}
    </div>
  );
}

export function ChallengeChain({ steps }: { steps: { k: string; v: string }[] }) {
  return (
    <HScroll label={`Challenge chain: ${steps.map((s) => s.k).join(" → ")}`}>
      <div className="cs-chain" aria-hidden="true">
        {steps.map((s, i) => (
          <div key={s.k} style={{ display: "contents" }}>
            <div className="cs-chain-step"><span className="k">{s.k}</span><p>{s.v}</p></div>
            {i < steps.length - 1 && <span className="cs-chain-arrow">→</span>}
          </div>
        ))}
      </div>
      <dl className="sr-only">{steps.map((s) => <div key={s.k}><dt>{s.k}</dt><dd>{s.v}</dd></div>)}</dl>
    </HScroll>
  );
}

export function StatusScale({ items, active }: { items: { k: string; v: string }[]; active: number[] }) {
  return (
    <div className="cs-status" role="img" aria-label={`Engineering outcome: ${items.filter((_, i) => active.includes(i)).map((s) => s.k).join(", ")}`}>
      {items.map((s, i) => (
        <div key={s.k} className={active.includes(i) ? "on" : undefined} aria-hidden="true">
          <div className="k">{active.includes(i) ? "● " : "○ "}{s.k}</div>
          <div className="v">{s.v}</div>
        </div>
      ))}
    </div>
  );
}

export function EmpathyMap({ cells }: { cells: { k: string; v: string; tone?: "pain" | "need" }[] }) {
  return (
    <div className="cs-empathy">
      {cells.map((c) => (
        <div key={c.k} className={`cs-emp${c.tone === "pain" ? " cs-emp--pain" : c.tone === "need" ? " cs-emp--need" : ""}`}>
          <span className="k">{c.k}</span>
          <p>{c.v}</p>
        </div>
      ))}
    </div>
  );
}

export function SecurityStrip({ items }: { items: string[] }) {
  return (
    <div className="cs-secgrid">
      {items.map((s) => (
        <span key={s} className="cs-secbadge">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 1.8 13 3.6v4.1C13 11.2 10.8 13.6 8 14.6 5.2 13.6 3 11.2 3 7.7V3.6L8 1.8z" /><path d="M6 8l1.4 1.4L10 6.6" /></svg>
          {s}
        </span>
      ))}
    </div>
  );
}
