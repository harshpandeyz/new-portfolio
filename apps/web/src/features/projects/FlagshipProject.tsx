import type { Project } from "@hp/shared";
import { formatTaxonomy } from "../../lib/format";
import { IconArrowRight, IconExternal } from "../../components/ui/icons";
import { FLAGSHIP_GALLERY, FLAGSHIP_HERO, FLAGSHIP_SLUG, flagshipFlow } from "./flagshipConfig";

interface FlagshipProjectProps {
  project: Project;
  onOpen: (slug: string) => void;
}

function FlowIcon({ kind }: { kind: string }) {
  const c = { width: 15, height: 15, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "camera": return (<svg {...c} aria-hidden="true"><rect x="2.5" y="5" width="8.5" height="6.5" rx="1.2" /><path d="M11 7.2 13.4 5.6v5l-2.4-1.5" /><circle cx="6.8" cy="8.2" r="1.7" /></svg>);
    case "brain": return (<svg {...c} aria-hidden="true"><path d="M8 2.6c1-.9 2.9-.8 3.5 1 .9-.4 1.8.2 1.7 1.1.8.4.9 1.5.3 2.1.6.8 0 1.9-1 1.9" /><path d="M8 2.6c-1-.9-2.9-.8-3.5 1-.9-.4-1.8.2-1.7 1.1-.8.4-.9 1.5-.3 2.1-.6.8 0 1.9 1 1.9" /><path d="M8 2.6V6M3.5 9.4h3v2h3v-1.8" /></svg>);
    case "alert": return (<svg {...c} aria-hidden="true"><path d="M8 2.4 13.6 12.2H2.4L8 2.4z" /><path d="M8 7v3M8 11.2h.1" /></svg>);
    case "evidence": return (<svg {...c} aria-hidden="true"><rect x="3" y="7" width="10" height="6.5" rx="1.2" /><path d="M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7" /><circle cx="8" cy="10.2" r="1" fill="currentColor" stroke="none" /></svg>);
    case "ledger": return (<svg {...c} aria-hidden="true"><path d="M4 3.5h5.2a2 2 0 0 1 2 2v1H6a2 2 0 0 0-2 2v3.5" /><rect x="4" y="8.5" width="7.2" height="4" rx="1" /><path d="M5.8 10.5h3.6M5.8 12h3.6" /></svg>);
    case "attest": return (<svg {...c} aria-hidden="true"><path d="M8 2 13 4v3.6C13 10.8 10.6 13.2 8 14 5.4 13.2 3 10.8 3 7.6V4L8 2z" /><path d="M6.2 8 7.6 9.4 9.9 6.6" /></svg>);
    case "user": return (<svg {...c} aria-hidden="true"><circle cx="8" cy="5.2" r="2.3" /><path d="M3.2 13c.6-2.2 2.4-3.6 4.8-3.6s4.2 1.4 4.8 3.6" /></svg>);
    case "api": return (<svg {...c} aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="3.2" rx="1" /><rect x="2.5" y="9.5" width="11" height="3.2" rx="1" /></svg>);
    case "chat": return (<svg {...c} aria-hidden="true"><path d="M3 4.2a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 13 4.2v5.2a1.5 1.5 0 0 1-1.5 1.5H6.2L3 12.8V4.2z" /></svg>);
    default: return (<svg {...c} aria-hidden="true"><circle cx="8" cy="8" r="5.5" /><path d="M8 5.2v3.4l2 1.2" /></svg>);
  }
}

function CctvVisual({ project }: { project: Project }) {
  const strips = FLAGSHIP_GALLERY.slice(1);
  return (
    <>
      <div className="sw-visual" role="img" aria-label={`${project.title} — live operations dashboard`}>
        <img className="sw-photo" src={FLAGSHIP_HERO.src} alt={FLAGSHIP_HERO.alt} loading="eager" width={1200} height={675} decoding="async" fetchPriority="high" />
        <div className="sw-scrim" aria-hidden="true" />
        <div className="sw-hud" aria-hidden="true">
          <span className="sw-sys">CCTV-X · SECURITY OPS · YOLOv8n</span>
        </div>
        <div className="sw-cap"><span className="sw-k">{FLAGSHIP_HERO.role}</span><span className="sw-t">{FLAGSHIP_HERO.caption} — repository screen</span></div>
      </div>
      <div className="sw-film" aria-label="More real screens from the system">
        {strips.map((s) => (
          <figure key={s.src}>
            <img src={s.src} alt={s.alt} loading="lazy" decoding="async" />
            <figcaption>{s.kicker}</figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}

const RT_ROWS = [
  {
    lane: "INTAKE + DECISION",
    nodes: [
      { label: "Task", sub: "user intent", icon: "user", hot: false },
      { label: "Context", sub: "build + compress", icon: "brain", hot: false },
      { label: "Routing", sub: "model router", icon: "api", hot: true },
      { label: "Provider", sub: "OpenRouter · OpenAI", icon: "api", hot: true, pulse: true },
    ],
  },
  {
    lane: "EXECUTION + STREAM",
    nodes: [
      { label: "Tools", sub: "sandbox exec", icon: "brain", hot: false },
      { label: "Memory", sub: "cache · telemetry", icon: "ledger", hot: false },
      { label: "SSE", sub: "stream output", icon: "chat", hot: false },
      { label: "Re-eval", sub: "→ complete", icon: "attest", hot: true },
    ],
  },
];

function OrchestraVisual() {
  const flowLabel = "Task → Context → Routing → Provider → Tools → Memory → SSE → Re-evaluate → Complete";
  return (
    <div className="sw-visual sw-visual--rt" role="img" aria-label={`OrchestraAI runtime: ${flowLabel}`}>
      <div className="sw-runtime" aria-hidden="true">
        <div className="sw-rt-head"><span className="sw-rt-dot" /><span>ORCHESTRAAI · RUNTIME</span><span className="sw-rt-badge">ADAPTIVE</span></div>
        {RT_ROWS.map((row, ri) => (
          <div key={row.lane} className="sw-rt-row">
            <span className="sw-rt-rowtag">{row.lane}</span>
            <div className="sw-rt-nodes">
              {row.nodes.map((n, i) => (
                <div key={n.label} style={{ display: "contents" }}>
                  <div className={`sw-rt-node${n.hot ? " sw-hot" : ""}`}>
                    {n.pulse && <span className="sw-pulse" />}
                    <FlowIcon kind={n.icon} />
                    <b>{n.label}</b>
                    <span>{n.sub}</span>
                  </div>
                  {i < row.nodes.length - 1 && <div className="sw-rt-link" />}
                </div>
              ))}
            </div>
            {ri === 0 && <span className="sw-rt-loop">↩ LOOP BACK · RE-EVALUATE</span>}
          </div>
        ))}
        <div className="sw-rt-foot"><span>CONTROL PLANE</span><span style={{ marginLeft: "auto" }}>PG · REDIS · BYOK · SSE</span></div>
      </div>
    </div>
  );
}

const POSE: Record<string, string> = {
  "intelligent-surveillance-system": "Real-time detection and investigation tooling wired to tamper-evident evidence — encrypted, hashed, ledgered and externally timestamped.",
  orchestraai: "A control plane that routes every task to the right model, tool and memory — then streams it live.",
};

const ROLE_BY_SLUG: Record<string, string> = {
  "intelligent-surveillance-system": "Full-stack · AI pipeline · evidence chain",
  orchestraai: "Runtime · model routing · tooling",
  quantummind: "RAG · retrieval · streaming",
  skillmatch: "Backend · scoring · MVC",
};

export function FlagshipProject({ project, onOpen }: FlagshipProjectProps) {
  const isCctv = project.slug === FLAGSHIP_SLUG;
  const num = isCctv ? "01" : "02";
  const flow = flagshipFlow(project);
  const pose = POSE[project.slug] ?? project.shortDescription;
  const role = ROLE_BY_SLUG[project.slug] ?? project.category;

  return (
    <article className="sw-flag" data-reveal aria-label={`${project.title} — flagship project`}>
      {isCctv ? <CctvVisual project={project} /> : <OrchestraVisual />}
      <div className="sw-body">
        <div className="sw-meta">
          <span className="sw-num">{num}</span>
          <span className="sw-flag-tag">FLAGSHIP</span>
          <span>{project.year}</span>
          <span className={`sw-status sw-status--${project.status}`}>{project.status}</span>
        </div>
        <div className="sw-catline">{formatTaxonomy(project.category)} · {role}</div>
        <h3 className="sw-title">{project.title}</h3>
        {project.codename && <div className="codename sw-codename">{project.codename}</div>}
        <p className="sw-pose">{pose}</p>
        <div className="sw-stack" aria-label="Tech stack">
          {project.stack.slice(0, 6).map((t) => (<span key={t} className="tag">{t}</span>))}
        </div>
        {flow.length > 0 && (
          <div className="sw-arch">
            <div className="sw-arch-k"><span>{isCctv ? "Detection → evidence pipeline" : "Runtime execution loop"}</span><em>{String(flow.length).padStart(2, "0")} stages</em></div>
            <div className="sw-pipe" role="img" aria-label={`System flow: ${flow.map((n) => n.label).join(" → ")}`}>
              {flow.map((n, i) => (
                <div key={n.label} style={{ display: "contents" }}>
                  <div className="sw-step"><FlowIcon kind={n.icon} /><b>{n.label}</b><span>{n.sub}</span></div>
                  {i < flow.length - 1 && <span className="sw-conn" aria-hidden="true">→</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="sw-cta">
          <button type="button" className="btn btn-solid" onClick={() => onOpen(project.slug)} aria-label={`Read case study: ${project.title}`}>
            Case Study <IconArrowRight />
          </button>
          {project.githubUrl && (
            <a className="sw-gh" href={project.githubUrl} target="_blank" rel="noopener noreferrer" aria-label={`View source for ${project.title} on GitHub`}>
              GitHub <IconExternal />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
