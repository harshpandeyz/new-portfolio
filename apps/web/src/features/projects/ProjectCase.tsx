import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api, resolveMediaUrl } from "../../lib/api";
import { formatTaxonomy } from "../../lib/format";
import type { Project } from "@hp/shared";
import { unlock } from "../../lib/achievements";
import { useData } from "../../lib/data";
import { Button } from "../../components/ui/Button";
import { IconArrowLeft, IconArrowRight, IconExternal } from "../../components/ui/icons";

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

const STEPS = [
  { id: "overview", label: "Overview" },
  { id: "architecture", label: "Architecture" },
  { id: "decisions", label: "Decisions" },
  { id: "security", label: "Security" },
  { id: "results", label: "Results" },
] as const;

interface ProjectCaseProps {
  onViewResume: () => void;
}

export function ProjectCase({ onViewResume }: ProjectCaseProps) {
  const { slug } = useParams<{ slug: string }>();
  const { projects } = useData();
  const [project, setProject] = useState<Project | null>(() => projects.find((p) => p.slug === slug) ?? null);
  const [loading, setLoading] = useState(!project);
  const [notFound, setNotFound] = useState(false);
  const [active, setActive] = useState<string>("overview");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

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
    setActive("overview");
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

  // Sticky in-page scroll spy for the case-study navigation.
  useEffect(() => {
    if (!project) return;
    const onScroll = () => {
      const mid = window.scrollY + window.innerHeight * 0.35;
      let current = "overview";
      for (const step of STEPS) {
        const el = sectionRefs.current[step.id];
        if (el && el.offsetTop <= mid) current = step.id;
      }
      setActive(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [project]);

  const related = useMemo(
    () => projects.filter((p) => p.slug !== slug && (p.category === project?.category || p.stack.some((s) => project?.stack.includes(s)))).slice(0, 3),
    [projects, slug, project],
  );

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <h1 className="visually-hidden">Loading project</h1>
        <span className="mono mono-dim">Loading project…</span>
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <h1 className="visually-hidden">Project not found</h1>
          <div className="mono mono-dim" style={{ marginBottom: 18 }}>Project not found</div>
          <Link className="btn" to="/#work">← Back to selected work</Link>
        </div>
      </div>
    );
  }

  const scrollStep = (id: string) => sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <header className="case-hero">
        <div className="container">
          <Link to="/#work" className="back"><IconArrowLeft /> Back to selected work</Link>
          <div className="eyebrow" style={{ marginBottom: 14 }}>{formatTaxonomy(project.category)}</div>
          <h1>{project.title}</h1>
          {project.codename && <div className="codename">{project.codename}</div>}
          <p className="short">{project.shortDescription}</p>

          {/* PROJECT SNAPSHOT */}
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

      <div className="container"><div className="case-media" aria-label={`${project.title} project preview`}>
        {project.heroImage ? <img src={resolveMediaUrl(project.heroImage)} alt={`${project.title} project preview`} /> : <div className="project-art"><span>{formatTaxonomy(project.category).split(" · ")[0]}</span><strong>{project.title.slice(0, 1)}</strong><i /></div>}
      </div></div>

      <div className="case-layout">
        <nav className="case-tabs" aria-label="Case study sections">
          {STEPS.map((step) => (
            <button
              key={step.id}
              className={active === step.id ? "active" : ""}
              aria-current={active === step.id ? "true" : undefined}
              onClick={() => scrollStep(step.id)}
            >
              {step.label}
            </button>
          ))}
        </nav>

        <div className="case-body">
          <div className="case-panel">
            <section ref={(el) => { sectionRefs.current["overview"] = el; }} data-step="overview">
              <h2>Overview</h2>
              <p className="lede">{project.longDescription ?? project.shortDescription}</p>
              {project.problem && (<><h3>01 — The problem</h3><p>{project.problem}</p></>)}
              {project.solution && (<><h3>02 — The solution</h3><p>{project.solution}</p></>)}
              {project.challenges && (<><h3>03 — What was difficult</h3><p>{project.challenges}</p></>)}
              {project.results && (<><h3>04 — Results</h3><p>{project.results}</p></>)}
            </section>

            <section ref={(el) => { sectionRefs.current["architecture"] = el; }} data-step="architecture">
              <h2>Architecture</h2>
              <p>{project.architecture ?? "Architecture documentation for this module is summarized in the repository README."}</p>
              {project.dataFlow.length > 0 ? <FlowDiagram steps={project.dataFlow} title={project.title} /> : <p className="mono mono-dim">Architecture notes are available in the repository README.</p>}

              <h2>Technology</h2>
              <div className="case-stack-grid">
                {project.stack.map((t) => <span className="tag" key={t} style={{ justifyContent: "center", padding: "10px 12px" }}>{t}</span>)}
              </div>
            </section>

            <section ref={(el) => { sectionRefs.current["decisions"] = el; }} data-step="decisions">
              <h2>Engineering decisions</h2>
              {project.decisions.length > 0 ? (
                <div className="case-list">
                  {project.decisions.map((d, i) => (
                    <div className="case-list-item" key={i}><span className="n">{String(i + 1).padStart(2, "0")}</span>{d}</div>
                  ))}
                </div>
              ) : (
                <p>Decision records for this project live in the repository history.</p>
              )}
            </section>

            <section ref={(el) => { sectionRefs.current["security"] = el; }} data-step="security">
              <h2>Security & reliability</h2>
              {project.securityNotes ? (
                <>
                  <p>Security properties implemented in this system, as verifiable in the repository.</p>
                  <div className="case-list">
                    {project.securityNotes.split(" · ").map((s, i) => (
                      <div className="case-list-item" key={i}><span className="n">{String(i + 1).padStart(2, "0")}</span>{s}</div>
                    ))}
                  </div>
                </>
              ) : (
                <p>No dedicated security layer is claimed for this module.</p>
              )}
            </section>

            <section ref={(el) => { sectionRefs.current["results"] = el; }} data-step="results">
              <h2>Results & lessons</h2>
              <p>{project.results ?? "Outcomes are summarized in the repository documentation."}</p>
              <div className="case-links" style={{ marginTop: 28 }}>
                {project.githubUrl && <a className="btn" href={project.githubUrl} target="_blank" rel="noopener noreferrer">Source repository <IconExternal /></a>}
                {project.liveUrl && <a className="btn btn-solid" href={project.liveUrl} target="_blank" rel="noopener noreferrer">Live deployment <IconExternal /></a>}
                <Button onClick={onViewResume}>View résumé</Button>
              </div>
              <p className="mono mono-dim" style={{ marginTop: 26, fontSize: 9.5 }}>
                Details are drawn from the public repository and project record.
              </p>
            </section>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="container" style={{ paddingBottom: 90 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>More selected work</div>
          <div className="proj-grid">
            {related.map((p) => (
              <Link to={`/projects/${p.slug}`} className={`proj-node tier-${p.tier}`} key={p.id}>
                <div className="pn-top"><span className="pn-id">{formatTaxonomy(p.category)}</span><IconArrowRight /></div>
                <h3>{p.title}</h3>
                <p>{p.shortDescription}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}