import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { unlock } from "../../lib/achievements";
import type { PublicProject } from "@hp/shared";
import { api } from "../../lib/api";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState";
import "../../styles/subspace.css";
import "../archive.css";

const TIER_LABELS: Record<PublicProject["tier"], string> = {
  featured: "Featured",
  secondary: "Secondary",
  experiment: "Experiment",
  academic: "Academic",
  legacy: "Legacy",
  internship: "Internship",
};

const DOMAIN_FILTERS = ["All", "Backend", "AI / ML", "Full Stack", "Mobile", "Frontend", "DevOps", "Academic", "Experiments"] as const;
type DomainFilter = (typeof DOMAIN_FILTERS)[number];

function matchesDomain(p: PublicProject, filter: DomainFilter): boolean {
  switch (filter) {
    case "All":
      return true;
    case "Backend": return p.domains.includes("BACKEND");
    case "AI / ML": return p.domains.includes("AI_ML");
    case "Full Stack": return p.domains.includes("FULL_STACK");
    case "Mobile": return p.domains.includes("MOBILE");
    case "Frontend": return p.domains.includes("FRONTEND");
    case "DevOps": return p.domains.includes("DEVOPS");
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
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const navigate = useNavigate();
  const [domain, setDomain] = useState<DomainFilter>("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    api.projects(undefined, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setProjects(result.projects); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retryKey]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...projects]
      .sort((a, b) => a.order - b.order)
      .filter((p) => matchesDomain(p, domain))
      .filter((p) => !q || [p.title, p.category, p.stack.join(" "), p.shortDescription, p.longDescription ?? "", p.year].some((field) => field.toLowerCase().includes(q)));
  }, [projects, domain, query]);

  const open = (slug: string) => {
    unlock("explorer");
    navigate(`/projects/${slug}`);
  };

  return (
    <div className="archive-page subspace" data-tier="featured" aria-label="Project archive">
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

        {error && projects.length > 0 && <p className="archive-stale" role="status">Refresh failed. Showing the last loaded project list. <button type="button" onClick={() => setRetryKey((key) => key + 1)}>Try again</button></p>}
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
          <ErrorState message="Projects couldn't load." onRetry={() => setRetryKey((key) => key + 1)} />
        ) : query || domain !== "All" ? (
          <EmptyState>No projects match those filters.</EmptyState>
        ) : (
          <EmptyState>{loading ? "Projects are loading…" : "No projects are published yet."}</EmptyState>
        )}
      </div>
    </div>
  );
}
