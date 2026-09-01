import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api, resolveMediaUrl } from "../../lib/api";
import { formatTaxonomy } from "../../lib/format";
import type { Project } from "@hp/shared";
import { unlock } from "../../lib/achievements";
import { useData } from "../../lib/data";
import { Button } from "../../components/ui/Button";
import { IconArrowLeft, IconArrowRight, IconExternal } from "../../components/ui/icons";
import { TechGlyph } from "../tech/TechIcons";
import { ProjectMedia } from "./ProjectMedia";
import {
  FLAGSHIP_GALLERY,
  FLAGSHIP_HERO,
  FLAGSHIP_SLUG,
  flagshipFacts,
  systemMap,
} from "./flagshipConfig";

// ── System map icons (consistent grammar) ──────────────────
function MapIcon({ kind }: { kind: string }) {
  const c = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.35, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "camera":
      return <svg {...c} aria-hidden="true"><rect x="2.5" y="5" width="8.5" height="6.5" rx="1.2" /><path d="M11 7.2 13.4 5.6v5l-2.4-1.5" /><circle cx="6.8" cy="8.2" r="1.7" /></svg>;
    case "brain":
      return <svg {...c} aria-hidden="true"><path d="M8 2.6c1-.9 2.9-.8 3.5 1 .9-.4 1.8.2 1.7 1.1.8.4.9 1.5.3 2.1.6.8 0 1.9-1 1.9" /><path d="M8 2.6c-1-.9-2.9-.8-3.5 1-.9-.4-1.8.2-1.7 1.1-.8.4-.9 1.5-.3 2.1-.6.8 0 1.9 1 1.9" /><path d="M8 2.6V6M3.5 9.4h3v2h3v-1.8" /></svg>;
    case "alert":
      return <svg {...c} aria-hidden="true"><path d="M8 2.4 13.6 12.2H2.4L8 2.4z" /><path d="M8 7v3M8 11.2h.1" /></svg>;
    case "evidence":
      return <svg {...c} aria-hidden="true"><rect x="3" y="7" width="10" height="6.5" rx="1.2" /><path d="M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7" /><circle cx="8" cy="10.2" r="1" fill="currentColor" stroke="none" /></svg>;
    case "ledger":
      return <svg {...c} aria-hidden="true"><path d="M4 3.5h5.2a2 2 0 0 1 2 2v1H6a2 2 0 0 0-2 2v3.5" /><rect x="4" y="8.5" width="7.2" height="4" rx="1" /><path d="M5.8 10.5h3.6M5.8 12h3.6" /></svg>;
    case "attest":
    case "shield":
      return <svg {...c} aria-hidden="true"><path d="M8 2 13 4v3.6C13 10.8 10.6 13.2 8 14 5.4 13.2 3 10.8 3 7.6V4L8 2z" /><path d="M6.2 8 7.6 9.4 9.9 6.6" /></svg>;
    case "documents":
      return <svg {...c} aria-hidden="true"><path d="M4.5 2.5h5l3 3v8H4.5z" /><path d="M9.5 2.5v3h3" /><path d="M6 7h4M6 9.5h4M6 12h2.5" /></svg>;
    case "ingest":
      return <svg {...c} aria-hidden="true"><rect x="3" y="7" width="10" height="6" rx="1" /><path d="M5 7V5.2a3 3 0 0 1 6 0V7" /></svg>;
    case "search":
      return <svg {...c} aria-hidden="true"><circle cx="7" cy="7" r="4" /><path d="M10.2 10.2 13 13" /></svg>;
    case "chat":
      return <svg {...c} aria-hidden="true"><path d="M3 4.2a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 13 4.2v5.2a1.5 1.5 0 0 1-1.5 1.5H6.2L3 12.8V4.2z" /></svg>;
    case "user":
      return <svg {...c} aria-hidden="true"><circle cx="8" cy="5.2" r="2.3" /><path d="M3.2 13c.6-2.2 2.4-3.6 4.8-3.6s4.2 1.4 4.8 3.6" /></svg>;
    case "auth":
      return <svg {...c} aria-hidden="true"><path d="M8 2 12.8 4.2v3.6C12.8 10.8 10.7 13.1 8 14 5.3 13.1 3.2 10.8 3.2 7.8V4.2L8 2z" /></svg>;
    case "api":
      return <svg {...c} aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="3.2" rx="1" /><rect x="2.5" y="9.5" width="11" height="3.2" rx="1" /></svg>;
    case "social":
      return <svg {...c} aria-hidden="true"><circle cx="8" cy="4" r="1.8" /><circle cx="3.8" cy="12" r="1.6" /><circle cx="12.2" cy="12" r="1.6" /></svg>;
    case "web":
      return <svg {...c} aria-hidden="true"><rect x="2" y="3" width="12" height="9" rx="1.2" /><path d="M2 5.5h12" /></svg>;
    default:
      return <svg {...c} aria-hidden="true"><circle cx="8" cy="8" r="5" /><path d="M8 5.2v3.4l2 1.2" /></svg>;
  }
}

function SystemMap({ project }: { project: Project }) {
  const nodes = systemMap(project);
  if (nodes.length === 0) return null;
  return (
    <div className="case-system-map" role="img" aria-label={`System architecture: ${nodes.map((n) => n.title).join(" → ")}`}>
      <div className="csm-track" aria-hidden="true">
        {nodes.map((n, i) => (
          <div key={n.title} className="csm-node">
            <span className="csm-icon"><MapIcon kind={n.icon} /></span>
            <span className="csm-title">{n.title}</span>
            <span className="csm-detail">{n.detail}</span>
            {i < nodes.length - 1 && <span className="csm-arrow" aria-hidden="true">→</span>}
          </div>
        ))}
      </div>
      <p className="csm-caption">
        {project.slug === FLAGSHIP_SLUG
          ? "Input → intelligence → event → sealed evidence → hash chain → Bitcoin attestation. The dashboard is the operational surface."
          : "Each stage is grounded in the repository implementation — no invented abstractions."}
      </p>
      <ol className="sr-only">
        {nodes.map((n) => (
          <li key={n.title}>{n.title}: {n.detail}</li>
        ))}
      </ol>
    </div>
  );
}

function FlagshipTech({ project }: { project: Project }) {
  if (project.slug !== FLAGSHIP_SLUG) {
    return (
      <div className="case-tech">
        {project.stack.map((t) => (
          <div className="case-tech-item" key={t}>
            <TechGlyph name={t} />
            <span>{t}</span>
          </div>
        ))}
      </div>
    );
  }
  const groups: { label: string; items: string[] }[] = [
    { label: "AI", items: ["YOLOv8", "OpenCV"] },
    { label: "Backend", items: ["Python", "FastAPI"] },
    { label: "Data", items: ["MongoDB"] },
    { label: "Security", items: ["AES-GCM", "SHA-256", "JWT", "CSRF", "Rate limiting"] },
    { label: "Deployment", items: ["Docker Compose", "Caddy"] },
    { label: "Verification", items: ["OpenTimestamps"] },
    { label: "UI", items: ["React"] },
    { label: "Tests", items: ["Pytest"] },
  ];
  return (
    <div className="case-tech-groups">
      {groups.map((g) => (
        <div key={g.label} className="ctg">
          <span className="ctg-label">{g.label}</span>
          <div className="ctg-items">
            {g.items.map((t) => (
              <span key={t} className="case-tech-item">
                <TechGlyph name={t} />
                <span>{t}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ProjectCaseProps {
  onViewResume: () => void;
}

export function ProjectCase({ onViewResume }: ProjectCaseProps) {
  const { slug } = useParams<{ slug: string }>();
  const { projects } = useData();
  const [project, setProject] = useState<Project | null>(() => projects.find((p) => p.slug === slug) ?? null);
  const [loading, setLoading] = useState(!project);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let live = true;
    const cached = projects.find((p) => p.slug === slug);
    if (cached) {
      setProject(cached);
      setNotFound(false);
      setLoading(false);
    } else {
      setProject(null);
      setNotFound(false);
      setLoading(true);
      api
        .project(slug ?? "")
        .then((r) => {
          if (!live) return;
          setProject(r.project);
          setNotFound(false);
        })
        .catch(() => live && setNotFound(true))
        .finally(() => live && setLoading(false));
    }
    return () => {
      live = false;
    };
  }, [slug, projects]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (project) {
      document.title = `${project.title} — Harsh Pandey`;
      unlock("explorer");
    }
    return () => {
      document.title = "Harsh Pandey — Software Engineer";
    };
  }, [project]);

  const { prev, next } = useMemo(() => {
    const ordered = [...projects].sort((a, b) => a.order - b.order);
    const idx = project ? ordered.findIndex((p) => p.id === project.id) : -1;
    return {
      prev: idx > 0 ? ordered[idx - 1] : null,
      next: idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null,
    };
  }, [projects, project]);

  if (loading) {
    return (
      <div className="archive-page" style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <h1 className="visually-hidden">Loading project</h1>
        <span className="mono mono-dim">Loading project…</span>
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="archive-page" style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <h1 className="visually-hidden">Project not found</h1>
          <div className="mono mono-dim" style={{ marginBottom: 18 }}>
            Project not found
          </div>
          <Link className="btn" to="/#work">
            ← Back to selected work
          </Link>
        </div>
      </div>
    );
  }

  const isFlagship = project.slug === FLAGSHIP_SLUG;
  const facts = flagshipFacts(project);
  // For flagship, first gallery image is the hero; remaining are the narrative gallery
  const remainingGallery = isFlagship ? FLAGSHIP_GALLERY.slice(1) : [];

  return (
    <div className="subspace" data-tier={project.tier}>
      <header className="case-hero case-hero--tight">
        <div className="container">
          <Link to="/#work" className="back">
            <IconArrowLeft /> Back to work
          </Link>
          <div className="eyebrow case-eyebrow">{formatTaxonomy(project.category)}</div>
          <h1>{project.title}</h1>
          {project.codename && <div className="codename">{project.codename}</div>}
          <p className="short case-short">{project.shortDescription}</p>

          <div className="case-snapshot case-snapshot--minimal">
            <div className="cell">
              <div className="k">Year</div>
              <div className="v">{project.year}</div>
            </div>
            <div className="cell">
              <div className="k">Status</div>
              <div className="v" style={{ textTransform: "capitalize" }}>
                {project.status}
              </div>
            </div>
            <div className="cell">
              <div className="k">Stack</div>
              <div className="v">{project.stack.slice(0, 4).join(" · ")}</div>
            </div>
            <div className="cell case-links">
              {project.githubUrl && (
                <a className="btn btn-sm" href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                  GitHub <IconExternal />
                </a>
              )}
              {project.liveUrl && (
                <a className="btn btn-sm btn-solid" href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                  Live demo <IconExternal />
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 2. Real overview screen — appears before anything else */}
      {isFlagship ? (
        <div className="container case-hero-media" aria-label={`${project.title} — overview`}>
          <figure className="case-hero-figure">
            <img
              src={FLAGSHIP_HERO.src}
              alt={FLAGSHIP_HERO.alt}
              width={1470}
              height={803}
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
            <figcaption>
              <span className="cap-kicker">{FLAGSHIP_HERO.role}</span> {FLAGSHIP_HERO.caption}
            </figcaption>
          </figure>
        </div>
      ) : (
        <div className="container case-media" aria-label={`${project.title} project preview`}>
          <ProjectMedia project={project} />
        </div>
      )}

      {/* 3. System visual map — immediately after hero */}
      <div className="container case-arch">
        <SystemMap project={project} />
      </div>

      {/* 4. Key facts — compact strip */}
      {isFlagship && (
        <div className="container case-facts-strip" aria-label="System facts">
          {facts.map((f) => (
            <div key={f.k} className="cfs-cell">
              <span className="cfs-k">{f.k}</span>
              <span className="cfs-v">{f.v}</span>
            </div>
          ))}
        </div>
      )}

      {/* 5. Intentional gallery — remaining 3 images with narrative */}
      {isFlagship && remainingGallery.length > 0 && (
        <div className="container case-gallery-narrative" aria-label={`${project.title} screens`}>
          <div className="case-thumb-row">
            {remainingGallery.slice(0, 2).map((img) => (
              <figure key={img.src} className="case-thumb-card">
                <img src={img.src} alt={img.alt} loading="lazy" width={735} height={401} decoding="async" />
                <figcaption>
                  <span className="cap-kicker">{img.role}</span> {img.caption}
                </figcaption>
              </figure>
            ))}
          </div>
          <figure className="case-hero-figure" style={{ marginTop: 12 }}>
            <img
              src={remainingGallery[2]!.src}
              alt={remainingGallery[2]!.alt}
              loading="lazy"
              width={1470}
              height={803}
              decoding="async"
            />
            <figcaption>
              <span className="cap-kicker">{remainingGallery[2]!.role}</span> {remainingGallery[2]!.caption}
            </figcaption>
          </figure>
        </div>
      )}

      <div className="case-layout">
        <div className="case-body">
          <div className="case-panel case-panel--compact">
            {/* Problem / Solution — compact two-column */}
            {(project.problem || project.solution) && (
              <section className="case-split" data-step="narrative">
                {project.problem && (
                  <div>
                    <h2>Problem</h2>
                    <p className="case-desc-compact">{project.problem}</p>
                  </div>
                )}
                {project.solution && (
                  <div>
                    <h2>Solution</h2>
                    <p className="case-desc-compact">{project.solution}</p>
                  </div>
                )}
              </section>
            )}

            {/* Overview — single compact block */}
            <section data-step="overview">
              <h2>Overview</h2>
              <p className="case-desc-compact">{project.longDescription ?? project.shortDescription}</p>
            </section>

            {/* How it runs — prose only for nuance, visual already carries flow */}
            {project.architecture && (
              <section data-step="architecture-note">
                <h2>How it runs</h2>
                <p className="case-desc-compact case-note-compact">{project.architecture}</p>
              </section>
            )}

            {/* Challenge — compact */}
            {project.challenges && (
              <section data-step="challenges">
                <h2>What was difficult</h2>
                <div className="case-challenge">
                  <p className="case-desc-compact">{project.challenges}</p>
                </div>
              </section>
            )}

            {project.decisions.length > 0 && (
              <section data-step="decisions">
                <h2>Engineering decisions</h2>
                <div className="case-list case-list--compact">
                  {project.decisions.map((d, i) => (
                    <div className="case-list-item" key={i}>
                      <span className="n">{String(i + 1).padStart(2, "0")}</span>
                      <span className="case-decision-text">{d}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {project.securityNotes && (
              <section data-step="security">
                <h2>Security & reliability</h2>
                <div className="case-security-grid">
                  {project.securityNotes.split(" · ").map((s) => (
                    <span key={s} className="sec-badge">
                      {s}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section data-step="technology">
              <h2>Technology</h2>
              <FlagshipTech project={project} />
            </section>

            {project.gallery.length > 0 && !isFlagship && (
              <section data-step="gallery">
                <h2>In the repository</h2>
                <div className="case-gallery">
                  {project.gallery.map((src, i) => (
                    <img key={i} src={resolveMediaUrl(src)} alt={`${project.title} screenshot ${i + 1}`} loading="lazy" />
                  ))}
                </div>
              </section>
            )}

            {project.results && (
              <section data-step="results">
                <h2>Result</h2>
                <p className="case-desc-compact">{project.results}</p>
              </section>
            )}

            <section data-step="links">
              <div className="case-links" style={{ marginTop: 8 }}>
                {project.githubUrl && (
                  <a className="btn" href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                    Source repository <IconExternal />
                  </a>
                )}
                {project.liveUrl && (
                  <a className="btn btn-solid" href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                    Live deployment <IconExternal />
                  </a>
                )}
                <Button onClick={onViewResume}>View résumé</Button>
              </div>
              <p className="mono mono-dim" style={{ marginTop: 16, fontSize: 9.5 }}>
                Details are drawn from the public repository and project record.
              </p>
            </section>
          </div>
        </div>
      </div>

      <nav className="case-nav" aria-label="More projects">
        {prev ? (
          <Link to={`/projects/${prev.slug}`} className="case-nav-link" data-tier={prev.tier}>
            <span className="cn-label">
              <IconArrowLeft /> Previous
            </span>
            <span className="cn-title">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={`/projects/${next.slug}`} className="case-nav-link" data-tier={next.tier}>
            <span className="cn-label">
              Next <IconArrowRight />
            </span>
            <span className="cn-title">{next.title}</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
