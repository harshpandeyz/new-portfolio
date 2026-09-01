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

/** Progressive-draw SVG flow built from the project's real dataFlow steps. */
function FlowDiagram({ steps, title }: { steps: string[]; title: string }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setDrawn(true), 120);
    return () => window.clearTimeout(t);
  }, [steps]);

  const W = 900;
  const boxW = 190;
  const boxH = 58;
  const gapX = 34;
  const perRow = 3;
  const rows = Math.ceil(steps.length / perRow);
  const H = rows * (boxH + 56) + 40;

  return (
    <div className={`arch-diagram${drawn ? " drawn" : ""}`} aria-label={`Data flow diagram: ${title}`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-hidden="true">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-accent)" />
          </marker>
        </defs>
        <text className="ad-label" x={20} y={26}>How it works · {title}</text>
        {steps.map((step, i) => {
          const row = Math.floor(i / perRow);
          const col = i % perRow;
          const rtl = row % 2 === 1;
          const effCol = rtl ? perRow - 1 - col : col;
          const x = 30 + effCol * (boxW + gapX);
          const y = 48 + row * (boxH + 56);
          const words = step.split(" ");
          const lines: string[] = [];
          let line = "";
          for (const w of words) {
            if ((line + " " + w).trim().length > 26) {
              lines.push(line.trim());
              line = w;
            } else {
              line += " " + w;
            }
          }
          if (line.trim()) lines.push(line.trim());
          const next = steps[i + 1];
          const nRow = Math.floor((i + 1) / perRow);
          const nCol = (i + 1) % perRow;
          const nEff = nRow % 2 === 1 ? perRow - 1 - nCol : nCol;
          const nx = 30 + nEff * (boxW + gapX);
          const ny = 48 + nRow * (boxH + 56);
          const sameRow = row === nRow;
          return (
            <g key={i}>
              <rect className="ad-box accent" x={x} y={y} width={boxW} height={boxH} />
              {lines.slice(0, 3).map((l, li) => (
                <text key={li} className="ad-text" x={x + 14} y={y + 22 + li * 15}>
                  {l.length > 30 ? l.slice(0, 29) + "…" : l}
                </text>
              ))}
              {next && (
                sameRow
                  ? <path
                      className="ad-flow"
                      d={`M ${x + boxW + 2} ${y + boxH / 2} L ${nx - 6} ${ny + boxH / 2}`}
                      style={{ animationDelay: `${i * 0.18}s` }}
                    />
                  : <path
                      className="ad-flow"
                      d={`M ${x + boxW / 2} ${y + boxH + 2} L ${x + boxW / 2} ${y + boxH + 26} L ${nx + boxW / 2} ${y + boxH + 26} L ${nx + boxW / 2} ${ny - 6}`}
                      style={{ animationDelay: `${i * 0.18}s` }}
                    />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface ProjectCaseProps {
  onViewResume: () => void;
}

/** A case study is a visual engineering paper — mostly visuals, little text. */
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
      api.project(slug ?? "")
        .then((r) => { if (!live) return; setProject(r.project); setNotFound(false); })
        .catch(() => live && setNotFound(true))
        .finally(() => live && setLoading(false));
    }
    return () => { live = false; };
  }, [slug, projects]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (project) {
      document.title = `${project.title} — Harsh Pandey`;
      unlock("explorer");
    }
    return () => { document.title = "Harsh Pandey — Software Engineer"; };
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
          <div className="mono mono-dim" style={{ marginBottom: 18 }}>Project not found</div>
          <Link className="btn" to="/#work">← Back to selected work</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="subspace" data-tier={project.tier}>
      <header className="case-hero">
        <div className="container">
          <Link to="/#work" className="back"><IconArrowLeft /> Back to work</Link>
          <div className="eyebrow case-eyebrow">{formatTaxonomy(project.category)}</div>
          <h1>{project.title}</h1>
          {project.codename && <div className="codename">{project.codename}</div>}
          <p className="short case-short">{project.shortDescription}</p>

          <div className="case-snapshot">
            <div className="cell"><div className="k">Year</div><div className="v">{project.year}</div></div>
            <div className="cell"><div className="k">Status</div><div className="v" style={{ textTransform: "capitalize" }}>{project.status}</div></div>
            <div className="cell"><div className="k">Stack</div><div className="v">{project.stack.slice(0, 4).join(" · ")}</div></div>
            <div className="cell case-links">
              {project.githubUrl && <a className="btn btn-sm" href={project.githubUrl} target="_blank" rel="noopener noreferrer">GitHub <IconExternal /></a>}
              {project.liveUrl && <a className="btn btn-sm btn-solid" href={project.liveUrl} target="_blank" rel="noopener noreferrer">Live demo <IconExternal /></a>}
            </div>
          </div>
        </div>
      </header>

      <div className="container case-media" aria-label={`${project.title} project preview`}>
        <ProjectMedia project={project} />
      </div>

      <div className="case-layout">
        <div className="case-body">
          <div className="case-panel">
            {project.problem && (
              <section data-step="problem">
                <h2>The problem</h2>
                <p className="lede">{project.problem}</p>
              </section>
            )}

            {project.solution && (
              <section data-step="solution">
                <h2>The solution</h2>
                <p>{project.solution}</p>
              </section>
            )}

            <section data-step="overview">
              <h2>Overview</h2>
              <p>{project.longDescription ?? project.shortDescription}</p>
            </section>

            {project.dataFlow.length > 0 && (
              <section data-step="architecture">
                <h2>Architecture</h2>
                <p>{project.architecture ?? "Architecture documentation for this module is summarized in the repository README."}</p>
                <FlowDiagram steps={project.dataFlow} title={project.title} />
              </section>
            )}

            {project.challenges && (
              <section data-step="challenges">
                <h2>What was difficult</h2>
                <p>{project.challenges}</p>
              </section>
            )}

            <section data-step="technology">
              <h2>Technology</h2>
              <div className="case-tech">
                {project.stack.map((t) => (
                  <div className="case-tech-item" key={t}>
                    <TechGlyph name={t} />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </section>

            {project.decisions.length > 0 && (
              <section data-step="decisions">
                <h2>Engineering decisions</h2>
                <div className="case-list">
                  {project.decisions.map((d, i) => (
                    <div className="case-list-item" key={i}><span className="n">{String(i + 1).padStart(2, "0")}</span>{d}</div>
                  ))}
                </div>
              </section>
            )}

            {project.gallery.length > 0 && (
              <section data-step="gallery">
                <h2>In the repository</h2>
                <div className="case-gallery">
                  {project.gallery.map((src, i) => <img key={i} src={resolveMediaUrl(src)} alt={`${project.title} screenshot ${i + 1}`} loading="lazy" />)}
                </div>
              </section>
            )}

            {project.securityNotes && (
              <section data-step="security">
                <h2>Security & reliability</h2>
                <div className="case-list">
                  {project.securityNotes.split(" · ").map((s, i) => (
                    <div className="case-list-item" key={i}><span className="n">{String(i + 1).padStart(2, "0")}</span>{s}</div>
                  ))}
                </div>
              </section>
            )}

            {project.results && (
              <section data-step="results">
                <h2>Results</h2>
                <p>{project.results}</p>
              </section>
            )}

            <section data-step="links">
              <div className="case-links" style={{ marginTop: 8 }}>
                {project.githubUrl && <a className="btn" href={project.githubUrl} target="_blank" rel="noopener noreferrer">Source repository <IconExternal /></a>}
                {project.liveUrl && <a className="btn btn-solid" href={project.liveUrl} target="_blank" rel="noopener noreferrer">Live deployment <IconExternal /></a>}
                <Button onClick={onViewResume}>View résumé</Button>
              </div>
              <p className="mono mono-dim" style={{ marginTop: 20, fontSize: 9.5 }}>
                Details are drawn from the public repository and project record.
              </p>
            </section>
          </div>
        </div>
      </div>

      <nav className="case-nav" aria-label="More projects">
        {prev ? (
          <Link to={`/projects/${prev.slug}`} className="case-nav-link" data-tier={prev.tier}>
            <span className="cn-label"><IconArrowLeft /> Previous</span>
            <span className="cn-title">{prev.title}</span>
          </Link>
        ) : <span />}
        {next ? (
          <Link to={`/projects/${next.slug}`} className="case-nav-link" data-tier={next.tier}>
            <span className="cn-label">Next <IconArrowRight /></span>
            <span className="cn-title">{next.title}</span>
          </Link>
        ) : <span />}
      </nav>
    </div>
  );
}
