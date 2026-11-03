import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { unlock } from "../../lib/achievements";
import { FLAGSHIP_SLUGS, type PublicProject } from "@hp/shared";
import { api } from "../../lib/api";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState";
import { FLAGSHIP_GALLERY } from "./flagshipConfig";
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

const FEATURED_PATHS: Record<string, string[]> = {
  orchestraai: ["Task", "Context", "Route", "Provider", "Tools", "SSE"],
  senseline: ["Decode", "Units", "Calibrate", "Uncert.", "Decide", "Grade"],
};

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

  const featured = list
    .filter((project) => project.tier === "featured")
    .sort((a, b) => FLAGSHIP_SLUGS.indexOf(a.slug as (typeof FLAGSHIP_SLUGS)[number]) - FLAGSHIP_SLUGS.indexOf(b.slug as (typeof FLAGSHIP_SLUGS)[number]));
  const archive = list.filter((project) => project.tier !== "featured");

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
          <>
          {featured.length > 0 && (
            <section className="archive-featured" aria-label="Featured engineering systems">
              <div className="archive-group-heading"><span>01</span><h2>Featured systems</h2><small>{featured.length} projects</small></div>
              <div className="archive-featured-grid">
                {featured.map((project, index) => {
                  const cctv = project.slug === "intelligent-surveillance-system";
                  const path = FEATURED_PATHS[project.slug] ?? [];
                  return (
                    <article className="archive-feature-card" key={project.id}>
                      <button className="archive-feature-open" onClick={() => open(project.slug)} aria-label={`Open case study: ${project.title}`}>
                        <div className={`archive-feature-visual${cctv ? " archive-feature-visual--image" : ""}`}>
                          {cctv ? (
                            <img src={FLAGSHIP_GALLERY[0]!.src} alt={FLAGSHIP_GALLERY[0]!.alt} loading="lazy" width={FLAGSHIP_GALLERY[0]!.width} height={FLAGSHIP_GALLERY[0]!.height} />
                          ) : (
                            <div className="archive-path-map" role="img" aria-label={`${project.title} system stages: ${path.join(" → ")}`}>
                              <span className="archive-visual-label">{project.title} / SYSTEM PATH</span>
                              <div>{path.map((stage, stageIndex) => <span key={stage} title={stage}><i>{String(stageIndex + 1).padStart(2, "0")}</i><b>{stage}</b></span>)}</div>
                              <small>{project.slug === "senseline" ? "INFRASTRUCTURE VALIDATED · MODEL EXPERIMENTS NOT RUN" : "LIVE / DEMO · PROVIDER ROUTING · CHECKPOINTED STATE"}</small>
                            </div>
                          )}
                        </div>
                        <div className="archive-feature-copy">
                          <div className="archive-feature-meta"><span>{String(index + 1).padStart(2, "0")}</span><span>{project.category}</span><span>{project.year}</span></div>
                          <h3>{project.title}{project.codename && <small>{project.codename}</small>}</h3>
                          <p>{project.shortDescription}</p>
                          <div className="archive-feature-footer"><span>{project.stack.slice(0, 4).join(" · ")}</span><b>Read case study <span aria-hidden="true">↗</span></b></div>
                        </div>
                      </button>
                      {project.githubUrl && <a className="archive-feature-github" href={project.githubUrl} target="_blank" rel="noopener noreferrer">Repository ↗</a>}
                    </article>
                  );
                })}
              </div>
            </section>
          )}
          {archive.length > 0 && <>
          <div className="archive-group-heading archive-group-heading--all"><span>02</span><h2>Project archive</h2><small>{archive.length} projects</small></div>
          <ul className="archive-list">
            {archive.map((project, index) => (
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
          </>}
          </>
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
