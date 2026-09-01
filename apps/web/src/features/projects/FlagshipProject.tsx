import type { Project } from "@hp/shared";
import { formatTaxonomy } from "../../lib/format";
import { IconArrowRight, IconExternal } from "../../components/ui/icons";
import { TechGlyph } from "../tech/TechIcons";
import { FLAGSHIP_HERO, FLAGSHIP_SLUG, flagshipCompactFacts, flagshipFlow } from "./flagshipConfig";

interface FlagshipProjectProps {
  project: Project;
  onOpen: (slug: string) => void;
}

function FlowIcon({ kind }: { kind: string }) {
  const common = { width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "camera":
      return (
        <svg {...common} aria-hidden="true">
          <rect x="2.5" y="5" width="8.5" height="6.5" rx="1.2" />
          <path d="M11 7.2 13.4 5.6v5l-2.4-1.5" />
          <circle cx="6.8" cy="8.2" r="1.7" />
        </svg>
      );
    case "brain":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M8 2.6c1-.9 2.9-.8 3.5 1 .9-.4 1.8.2 1.7 1.1.8.4.9 1.5.3 2.1.6.8 0 1.9-1 1.9" />
          <path d="M8 2.6c-1-.9-2.9-.8-3.5 1-.9-.4-1.8.2-1.7 1.1-.8.4-.9 1.5-.3 2.1-.6.8 0 1.9 1 1.9" />
          <path d="M8 2.6V6M3.5 9.4h3v2h3v-1.8M5.8 11.4v1M10.2 11.4v1" />
        </svg>
      );
    case "alert":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M8 2.4 13.6 12.2H2.4L8 2.4z" />
          <path d="M8 7v3M8 11.2h.1" />
        </svg>
      );
    case "evidence":
      return (
        <svg {...common} aria-hidden="true">
          <rect x="3" y="7" width="10" height="6.5" rx="1.2" />
          <path d="M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7" />
          <circle cx="8" cy="10.2" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "ledger":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 3.5h5.2a2 2 0 0 1 2 2v1H6a2 2 0 0 0-2 2v3.5" />
          <rect x="4" y="8.5" width="7.2" height="4" rx="1" />
          <path d="M5.8 10.5h3.6M5.8 12h3.6" />
        </svg>
      );
    case "attest":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M8 2 13 4v3.6C13 10.8 10.6 13.2 8 14 5.4 13.2 3 10.8 3 7.6V4L8 2z" />
          <path d="M6.2 8 7.6 9.4 9.9 6.6" />
        </svg>
      );
    default:
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="8" cy="8" r="5.5" />
          <path d="M8 5.2v3.4l2 1.2" />
        </svg>
      );
  }
}

function CompactFlow({ nodes }: { nodes: ReturnType<typeof flagshipFlow> }) {
  if (nodes.length === 0) return null;
  return (
    <div className="flagship-compact-flow" role="img" aria-label={`System flow: ${nodes.map((n) => n.label).join(" → ")}`}>
      <div className="fcf-track" aria-hidden="true">
        {nodes.map((node, i) => (
          <span key={node.label} className="fcf-node">
            <span className="fcf-icon">
              <FlowIcon kind={node.icon} />
            </span>
            <span className="fcf-label">{node.label}</span>
            {i < nodes.length - 1 && <span className="fcf-arrow" aria-hidden="true">→</span>}
          </span>
        ))}
      </div>
      <ol className="sr-only">
        {nodes.map((n) => (
          <li key={n.label}>
            {n.label}: {n.sub}
          </li>
        ))}
      </ol>
    </div>
  );
}

function CompactFacts({ project }: { project: Project }) {
  const facts = flagshipCompactFacts(project);
  return (
    <dl className="flagship-facts" aria-label="Key facts">
      {facts.map((f) => (
        <div key={f.k} className="ff-item">
          <dt className="ff-k">{f.k}</dt>
          <dd className="ff-v">{f.v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function FlagshipProject({ project, onOpen }: FlagshipProjectProps) {
  const isFlagship = project.slug === FLAGSHIP_SLUG;
  const flow = flagshipFlow(project);
  const hero = isFlagship ? FLAGSHIP_HERO : null;

  return (
    <article className="flagship flagship--split" data-reveal>
      <div className="flagship-split">
        {hero ? (
          <figure className="flagship-visual">
            <img
              src={hero.src}
              alt={hero.alt}
              loading="eager"
              width={1470}
              height={803}
              decoding="async"
              fetchPriority="high"
            />
            <figcaption className="flagship-visual-cap">
              <span>{hero.role}</span> · {hero.kicker}
            </figcaption>
          </figure>
        ) : (
          <div className="flagship-visual flagship-visual--fallback" aria-hidden="true">
            <TechGlyph name={project.stack[0] ?? "code"} />
            <span>{project.title}</span>
          </div>
        )}

        <div className="flagship-info">
          <div className="flagship-info-top">
            <span className="flagship-kicker">Flagship — 01 / {formatTaxonomy(project.category)}</span>
            <span className="flagship-year">{project.year}</span>
          </div>
          <h3 className="flagship-title">{project.title}</h3>
          {project.codename && <div className="codename flagship-codename">{project.codename}</div>}
          <p className="flagship-oneLiner">{project.shortDescription}</p>

          <CompactFacts project={project} />
          <CompactFlow nodes={flow} />

          <div className="flagship-actions">
            <button className="btn btn-solid flagship-cta" onClick={() => onOpen(project.slug)} aria-label={`Read case study: ${project.title}`}>
              Read case study <IconArrowRight />
            </button>
            {project.githubUrl ? (
              <a
                className="flagship-gh"
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label={`View source for ${project.title} on GitHub`}
              >
                GitHub <IconExternal />
              </a>
            ) : (
              <span className="flagship-hint ticker ticker-dim">Architecture · evidence · code — inside</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
