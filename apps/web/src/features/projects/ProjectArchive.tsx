import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useData } from "../../lib/data";
import { unlock } from "../../lib/achievements";
import { api } from "../../lib/api";
import type { Project } from "@hp/shared";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState";

const TIER_LABELS: Record<Project["tier"], string> = {
  featured: "Featured",
  secondary: "Secondary",
  experiment: "Experiment",
  academic: "Academic",
  legacy: "Legacy",
  internship: "Internship",
};

const DOMAIN_FILTERS = ["All", "Backend", "AI / ML", "Full Stack", "Mobile", "Academic", "Experiments"] as const;
type DomainFilter = (typeof DOMAIN_FILTERS)[number];

function matchesDomain(p: Project, filter: DomainFilter): boolean {
  switch (filter) {
    case "All":
      return true;
    case "Backend":
      return /backend|spring|fastapi|node|api|docker|devops|ci-cd|mlops/i.test(p.category);
    case "AI / ML":
      return /ai|vision|nlp|rag|ml|mlops|search/i.test(p.category);
    case "Full Stack":
      return /full-stack|fullstack|platform|social|recommendation/i.test(p.category);
    case "Mobile":
      return /mobile|ios|android|game/i.test(p.category);
    case "Academic":
      return p.tier === "academic";
    case "Experiments":
      return p.tier === "experiment" || p.tier === "legacy" || p.tier === "internship";
    default:
      return true;
  }
}

/**
 * Project archive: a dedicated space, not a database table. Every row is a
 * compact case-study entry — title, one line, category, year — with the repo
 * one link away. Search + domain filters stay because they are genuinely useful.
 */
export function ProjectArchive() {
  const { projects, error, refresh } = useData();
  const navigate = useNavigate();
  const [domain, setDomain] = useState<DomainFilter>("All");
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...projects]
      .sort((a, b) => a.order - b.order)
      .filter((p) => matchesDomain(p, domain))
      .filter((p) => !q || [p.title, p.category, p.stack.join(" "), p.shortDescription].some((field) => field.toLowerCase().includes(q)));
  }, [projects, domain, query]);

  const open = (slug: string) => {
    unlock("explorer");
    void api.track("project_view", slug);
    navigate(`/projects/${slug}`);
  };

  return (
    <main className="archive-page subspace" data-tier="featured" aria-label="Project archive">
      <div className="container">
        <header className="archive-hero">
          <p className="archive-kicker">
            <Link to="/#work" className="archive-back"><span aria-hidden="true">←</span> Back to selected work</Link>
          </p>
          <p className="archive-ident mono">Archive · Projects</p>
          <h1>Everything I've built.</h1>
          <p className="archive-lede">
            Every project in one quiet list — filter by domain, or search for a stack.
          </p>

          <div className="archive-tools">
            <div className="archive-chips" role="group" aria-label="Filter by domain">
              {DOMAIN_FILTERS.map((f) => (
                <button
                  key={f}
                  className={`chip${domain === f ? " active" : ""}`}
                  aria-pressed={domain === f}
                  onClick={() => setDomain(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            <label className="archive-search">
              <span className="sr-only">Search projects</span>
              <input
                type="search"
                placeholder="Search by stack or keyword…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search projects"
              />
            </label>
          </div>
        </header>

        {list.length > 0 ? (
          <ul className="archive-list">
            {list.map((project, index) => (
              <li className="archive-row" data-tier={project.tier} key={project.id}>
                <button
                  className="archive-item"
                  onClick={() => open(project.slug)}
                  aria-label={`Open case study: ${project.title}`}
                >
                  <span className="archive-item-index ticker" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <span className="archive-item-main">
                    <span className="archive-item-title">{project.title}</span>
                    <span className="archive-item-desc">{project.shortDescription}</span>
                  </span>
                  <span className="archive-item-tier">{TIER_LABELS[project.tier]}</span>
                  <span className="archive-item-meta">{project.category.split(" / ")[0]} · {project.year}</span>
                  <span className="archive-item-arrow" aria-hidden="true">→</span>
                </button>
                {project.githubUrl && (
                  <a
                    className="archive-row-gh"
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    GitHub ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : error ? (
          <ErrorState message="Projects couldn't load." onRetry={() => void refresh()} />
        ) : query || domain !== "All" ? (
          <EmptyState>No projects match those filters.</EmptyState>
        ) : (
          <EmptyState>Projects are loading…</EmptyState>
        )}
      </div>
    </main>
  );
}