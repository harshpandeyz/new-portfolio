import type { Project } from "@hp/shared";
import { formatTaxonomy } from "../../lib/format";
import { IconArrowRight } from "../../components/ui/icons";
import { secondaryVisual } from "./flagshipConfig";

interface ProjectCardProps {
  project: Project;
  index: number;
  onOpen: (slug: string) => void;
  compact?: boolean;
}

function SIcon({ kind }: { kind: string }) {
  const common = { width: 15, height: 15, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.35, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "documents":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4.5 2.5h5l3 3v8H4.5z" />
          <path d="M9.5 2.5v3h3" />
          <path d="M6 7h4M6 9.5h4M6 12h2.5" />
        </svg>
      );
    case "ingest":
      return (
        <svg {...common} aria-hidden="true">
          <rect x="3" y="7" width="10" height="6" rx="1" />
          <path d="M5 7V5.2a3 3 0 0 1 6 0V7" />
          <path d="M6.5 10.2h3M8 8.5v3.5" />
        </svg>
      );
    case "search":
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="7" cy="7" r="4" />
          <path d="M10.2 10.2 13 13" />
          <path d="M5.2 7h3.6M7 5.2v3.6" />
        </svg>
      );
    case "brain":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M8 2.8c1-.9 2.9-.8 3.5 1 .9-.4 1.8.2 1.7 1.1.8.4.9 1.5.3 2.1.6.8 0 1.9-1 1.9" />
          <path d="M8 2.8c-1-.9-2.9-.8-3.5 1-.9-.4-1.8.2-1.7 1.1-.8.4-.9 1.5-.3 2.1-.6.8 0 1.9 1 1.9" />
          <path d="M8 2.8V6M3.5 9.4h3v2h3v-1.8" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M3 4.2a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 13 4.2v5.2a1.5 1.5 0 0 1-1.5 1.5H6.2L3 12.8V4.2z" />
          <path d="M5.5 7h5M8 5.5v3" />
        </svg>
      );
    case "user":
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="8" cy="5.2" r="2.3" />
          <path d="M3.2 13c.6-2.2 2.4-3.6 4.8-3.6s4.2 1.4 4.8 3.6" />
        </svg>
      );
    case "auth":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M8 2 12.8 4.2v3.6C12.8 10.8 10.7 13.1 8 14 5.3 13.1 3.2 10.8 3.2 7.8V4.2L8 2z" />
          <path d="M6 7.6 7.5 9 10 6.5" />
        </svg>
      );
    case "api":
      return (
        <svg {...common} aria-hidden="true">
          <rect x="2.5" y="3.5" width="11" height="3.2" rx="1" />
          <rect x="2.5" y="9.5" width="11" height="3.2" rx="1" />
          <circle cx="5" cy="5.1" r="0.7" fill="currentColor" stroke="none" />
          <circle cx="5" cy="11.1" r="0.7" fill="currentColor" stroke="none" />
          <path d="M8 6.7v2.8" />
        </svg>
      );
    case "social":
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="8" cy="4" r="1.8" />
          <circle cx="3.8" cy="12" r="1.6" />
          <circle cx="12.2" cy="12" r="1.6" />
          <path d="M8 5.8v2.2M5.1 11.1 6.8 6.2M9.2 6.2l1.7 4.9M5 12h6.2" />
        </svg>
      );
    case "web":
      return (
        <svg {...common} aria-hidden="true">
          <rect x="2" y="3" width="12" height="9" rx="1.2" />
          <path d="M2 5.5h12M5 8.5h3M5 10.2h5" />
          <circle cx="3.6" cy="4.2" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="8" cy="8" r="4.5" />
          <path d="M8 5.5v3l2 1.2" />
        </svg>
      );
  }
}

function SecondaryVisual({ slug }: { slug: string }) {
  const stages = secondaryVisual(slug);
  if (!stages) {
    return (
      <div className="pv-fallback">
        <span className="pv-fallback-kicker">System</span>
        <span className="pv-fallback-title">{slug}</span>
      </div>
    );
  }
  return (
    <div className="pv-track" aria-hidden="true">
      {stages.map((s, i) => (
        <div key={s.label} className="pv-node">
          <span className="pv-icon">
            <SIcon kind={s.icon} />
          </span>
          <span className="pv-label">{s.label}</span>
          <span className="pv-sub">{s.sub}</span>
          {i < stages.length - 1 && <span className="pv-arrow" aria-hidden="true">→</span>}
        </div>
      ))}
    </div>
  );
}

/** Secondary card — ~28% visual concept + compact information, one family. */
export function ProjectCard({ project, index, onOpen, compact }: ProjectCardProps) {
  return (
    <button
      className={`project-card${compact ? " project-card--compact" : ""} project-card--secondary`}
      onClick={() => onOpen(project.slug)}
      data-reveal
      data-reveal-delay={String((index % 3) * 0.08)}
      aria-label={`Open case study: ${project.title}`}
    >
      <div className="project-card-visual" aria-hidden="true">
        <SecondaryVisual slug={project.slug} />
      </div>
      <div className="project-card-body">
        <div className="project-meta">
          <span>{String(index + 1).padStart(2, "0")}</span>
          <span>{formatTaxonomy(project.category)}</span>
          <span>{project.year}</span>
        </div>
        <h3 className="project-card-title">{project.title}</h3>
        <p className="project-card-desc">{project.shortDescription}</p>
        {project.stack.length > 0 && (
          <div className="project-card-tags">
            {project.stack.slice(0, 3).map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        )}
        <span className="project-card-link">
          View case study <IconArrowRight />
        </span>
      </div>
    </button>
  );
}
