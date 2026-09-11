import type { Project } from "@hp/shared";
import { formatTaxonomy } from "../../lib/format";
import { secondaryVisual } from "./flagshipConfig";
import { IconArrowRight, IconExternal } from "../../components/ui/icons";

interface ProjectCardProps {
  project: Project;
  index: number;
  onOpen: (slug: string) => void;
  compact?: boolean;
}

function SIcon({ kind }: { kind: string }) {
  const c = { width: 15, height: 15, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.35, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "documents": return (<svg {...c} aria-hidden="true"><path d="M4.5 2.5h5l3 3v8H4.5z" /><path d="M9.5 2.5v3h3" /><path d="M6 7h4M6 9.5h4M6 12h2.5" /></svg>);
    case "ingest": return (<svg {...c} aria-hidden="true"><rect x="3" y="7" width="10" height="6" rx="1" /><path d="M5 7V5.2a3 3 0 0 1 6 0V7" /><path d="M6.5 10.2h3M8 8.5v3.5" /></svg>);
    case "search": return (<svg {...c} aria-hidden="true"><circle cx="7" cy="7" r="4" /><path d="M10.2 10.2 13 13" /><path d="M5.2 7h3.6M7 5.2v3.6" /></svg>);
    case "brain": return (<svg {...c} aria-hidden="true"><path d="M8 2.8c1-.9 2.9-.8 3.5 1 .9-.4 1.8.2 1.7 1.1.8.4.9 1.5.3 2.1.6.8 0 1.9-1 1.9" /><path d="M8 2.8c-1-.9-2.9-.8-3.5 1-.9-.4-1.8.2-1.7 1.1-.8.4-.9 1.5-.3 2.1-.6.8 0 1.9 1 1.9" /><path d="M8 2.8V6M3.5 9.4h3v2h3v-1.8" /></svg>);
    case "chat": return (<svg {...c} aria-hidden="true"><path d="M3 4.2a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 13 4.2v5.2a1.5 1.5 0 0 1-1.5 1.5H6.2L3 12.8V4.2z" /><path d="M5.5 7h5M8 5.5v3" /></svg>);
    case "user": return (<svg {...c} aria-hidden="true"><circle cx="8" cy="5.2" r="2.3" /><path d="M3.2 13c.6-2.2 2.4-3.6 4.8-3.6s4.2 1.4 4.8 3.6" /></svg>);
    case "auth": return (<svg {...c} aria-hidden="true"><path d="M8 2 12.8 4.2v3.6C12.8 10.8 10.7 13.1 8 14 5.3 13.1 3.2 10.8 3.2 7.8V4.2L8 2z" /><path d="M6 7.6 7.5 9 10 6.5" /></svg>);
    case "api": return (<svg {...c} aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="3.2" rx="1" /><rect x="2.5" y="9.5" width="11" height="3.2" rx="1" /><circle cx="5" cy="5.1" r="0.7" fill="currentColor" stroke="none" /><circle cx="5" cy="11.1" r="0.7" fill="currentColor" stroke="none" /><path d="M8 6.7v2.8" /></svg>);
    case "social": return (<svg {...c} aria-hidden="true"><circle cx="8" cy="4" r="1.8" /><circle cx="3.8" cy="12" r="1.6" /><circle cx="12.2" cy="12" r="1.6" /><path d="M8 5.8v2.2M5.1 11.1 6.8 6.2M9.2 6.2l1.7 4.9M5 12h6.2" /></svg>);
    case "web": return (<svg {...c} aria-hidden="true"><rect x="2" y="3" width="12" height="9" rx="1.2" /><path d="M2 5.5h12M5 8.5h3M5 10.2h5" /><circle cx="3.6" cy="4.2" r="0.6" fill="currentColor" stroke="none" /></svg>);
    default: return (<svg {...c} aria-hidden="true"><circle cx="8" cy="8" r="4.5" /><path d="M8 5.5v3l2 1.2" /></svg>);
  }
}

/** Repository-verified mini system diagrams. */
const MINI: Record<string, { label: string; sub: string; icon: string; core?: boolean }[]> = {
  quantummind: [
    { label: "Documents", sub: "research PDFs", icon: "documents" },
    { label: "Ingest", sub: "chunk · embed", icon: "ingest" },
    { label: "Retrieve", sub: "FAISS top-k", icon: "search" },
    { label: "Generate", sub: "grounded LLM", icon: "brain", core: true },
    { label: "Answer", sub: "SSE stream", icon: "chat" },
  ],
  skillmatch: [
    { label: "User", sub: "known skills", icon: "user" },
    { label: "Skills", sub: "catalogue", icon: "documents" },
    { label: "Role", sub: "target role", icon: "auth" },
    { label: "Match", sub: "scored rank", icon: "brain", core: true },
    { label: "Path", sub: "learn next", icon: "api" },
  ],
};

export function ProjectCard({ project, index, onOpen, compact }: ProjectCardProps) {
  const fallback = secondaryVisual(project.slug)?.map((s) => ({ label: s.label, sub: s.sub, icon: s.icon, core: false })) ?? null;
  const stages = (MINI[project.slug] ?? fallback) as { label: string; sub: string; icon: string; core?: boolean }[] | null;
  const flowLabel = stages ? stages.map((s) => s.label).join(" → ") : null;
  return (
    <article className={`sw-sec${compact ? " sw-compact" : ""}`} data-reveal data-reveal-delay={String((index % 3) * 0.08)} aria-label={`${project.title} — selected work`}>
      <div className="sw-mini" role={flowLabel ? "img" : undefined} aria-label={flowLabel ? `Mini system diagram: ${flowLabel}` : undefined}>
        <div className="sw-mini-k"><span>SYSTEM MAP</span><span>{String(flowLabel ? stages!.length : 0).padStart(2, "0")} STAGES</span></div>
        {stages ? (
          <div className="sw-mini-track" aria-hidden="true">
            {stages.map((s, i) => (
              <div key={s.label} style={{ display: "contents" }}>
                <div className={`sw-mnode${s.core ? " sw-core" : ""}`}><SIcon kind={s.icon} /><b>{s.label}</b><span>{s.sub}</span></div>
                {i < stages.length - 1 && <span className="sw-mconn">→</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="sw-mini-track" aria-hidden="true"><div className="sw-mnode"><b>System</b><span>{project.slug}</span></div></div>
        )}
      </div>
      <div className="sw-sec-body">
        <div className="project-meta"><span>{String(index + 1).padStart(2, "0")}</span><span>{formatTaxonomy(project.category)}</span><span>{project.year}</span></div>
        <h3 className="sw-sec-title">{project.title}</h3>
        <p className="sw-sec-desc">{project.shortDescription}</p>
        {project.stack.length > 0 && (
          <div className="project-card-tags" aria-label="Tech stack">
            {project.stack.slice(0, 3).map((tag) => (<span className="tag" key={tag}>{tag}</span>))}
          </div>
        )}
        <div className="sw-sec-actions">
          <button type="button" className="sw-link" onClick={() => onOpen(project.slug)} aria-label={`Open case study: ${project.title}`} style={{ padding: 0 }}>
            Case Study <IconArrowRight />
          </button>
          {project.githubUrl && (<a className="sw-ghlink" href={project.githubUrl} target="_blank" rel="noopener noreferrer" aria-label={`View source for ${project.title} on GitHub`}>GitHub <IconExternal /></a>)}
        </div>
      </div>
    </article>
  );
}
