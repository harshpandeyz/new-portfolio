import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api, resolveMediaUrl } from "../../lib/api";
import { formatTaxonomy } from "../../lib/format";
import type { Project } from "@hp/shared";
import { unlock } from "../../lib/achievements";
import { useData } from "../../lib/data";

type Tab = "overview" | "architecture" | "security" | "decisions";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "architecture", label: "Architecture" },
  { id: "security", label: "Security" },
  { id: "decisions", label: "Decisions" },
];

/** Progressive-draw SVG pipeline built from the project's real dataFlow steps. */
function FlowDiagram({ steps, title }: { steps: string[]; title: string }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setDrawn(true), 150);
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
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
          </marker>
        </defs>
        <text className="ad-label" x={20} y={26}>How it works · {title}</text>
        {steps.map((step, i) => {
          const row = Math.floor(i / perRow);
          const col = i % perRow;
          // serpentine layout
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
                <text key={li} className="ad-text" x={x + 14} y={y + 22 + li * 15}>{l.length > 30 ? l.slice(0, 29) + "…" : l}</text>
              ))}
              {next &&
                (sameRow ? (
                  <path
                    className="ad-flow"
                    d={`M ${x + boxW + 2} ${y + boxH / 2} L ${nx - 6} ${ny + boxH / 2}`}
                    style={{ animationDelay: `${i * 0.18}s` }}
                  />
                ) : (
                  <path
                    className="ad-flow"
                    d={`M ${x + boxW / 2} ${y + boxH + 2} L ${x + boxW / 2} ${y + boxH + 26} L ${nx + boxW / 2} ${y + boxH + 26} L ${nx + boxW / 2} ${ny - 6}`}
                    style={{ animationDelay: `${i * 0.18}s` }}
                  />
                ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function ProjectCase() {
  const { slug } = useParams<{ slug: string }>();
  const { projects } = useData();
  const [project, setProject] = useState<Project | null>(
    () => projects.find((p) => p.slug === slug) ?? null,
  );
  const [loading, setLoading] = useState(!project);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  // Re-resolve state whenever the slug changes so navigating between case
  // studies never shows a stale project or carries the previous tab over.
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
          unlock("explorer");
        })
        .catch(() => live && setNotFound(true))
        .finally(() => live && setLoading(false));
    }
    setTab("overview");
    return () => {
      live = false;
    };
  }, [slug, projects]);

  useEffect(() => {
    if (project && tab === "architecture") unlock("deepdive");
  }, [tab, project]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (project) document.title = `${project.title} — Harsh Pandey`;
    return () => {
      document.title = "Harsh Pandey — Software Engineer";
    };
  }, [project]);

  const related = useMemo(
    () => projects.filter((p) => p.slug !== slug && (p.category === project?.category || p.stack.some((s) => project?.stack.includes(s)))).slice(0, 3),
    [projects, slug, project],
  );

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <span className="mono mono-dim">Loading project…</span>
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div className="mono mono-dim" style={{ marginBottom: 18 }}>Project not found</div>
          <Link className="btn" to="/#projects">← Back to selected work</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="case-hero">
        <div className="container">
          <Link to="/#projects" className="back">← Back to selected work</Link>
          <div className="eyebrow" style={{ marginBottom: 14 }}>{formatTaxonomy(project.category)}</div>
          <h1>{project.title}</h1>
          {project.codename && <div className="codename">{project.codename}</div>}
          <p className="short">{project.shortDescription}</p>
          <div className="case-meta">
            <div className="cell"><div className="k">Status</div><div className="v" style={{ textTransform: "capitalize" }}>{project.status}</div></div>
            <div className="cell"><div className="k">Year</div><div className="v">{project.year}</div></div>
            <div className="cell"><div className="k">Stack</div><div className="v">{project.stack.slice(0, 3).join(" · ")}</div></div>
          </div>
        </div>
      </header>

      <div className="container"><div className="case-media" aria-label={`${project.title} project preview`}>
        {project.heroImage ? <img src={resolveMediaUrl(project.heroImage)} alt="" /> : <div className="project-art"><span>{formatTaxonomy(project.category).split(" · ")[0]}</span><strong>{project.title.slice(0, 1)}</strong><i /></div>}
      </div></div>

      <nav className="case-tabs" role="tablist" aria-label="Case study sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`case-tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="case-body">
        <div className="container case-panel">
          {tab === "overview" && (
            <div>
              <h3>Why it exists</h3>
              {project.longDescription ? (
                <p className="lede">{project.longDescription}</p>
              ) : (
                <p className="lede">{project.shortDescription}</p>
              )}
              {project.problem && (<><h3 style={{ marginTop: 34 }}>01 — The problem</h3><p>{project.problem}</p></>)}
              {project.solution && (<><h3 style={{ marginTop: 34 }}>02 — The solution</h3><p>{project.solution}</p></>)}
              {project.challenges && (<><h3 style={{ marginTop: 34 }}>03 — What was difficult</h3><p>{project.challenges}</p></>)}
              {project.results && (<><h3 style={{ marginTop: 34 }}>04 — Results</h3><p>{project.results}</p></>)}

              <h3 style={{ marginTop: 40 }}>Stack</h3>
              <div className="case-stack-grid">
                {project.stack.map((t) => <span className="tag" key={t} style={{ justifyContent: "center", padding: "10px 12px" }}>{t}</span>)}
              </div>

              <div className="case-links">
                {project.githubUrl && (
                  <a className="btn" href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                    Source repository <span aria-hidden="true">↗</span>
                  </a>
                )}
                {project.liveUrl && (
                  <a className="btn" href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                    Live deployment <span aria-hidden="true">↗</span>
                  </a>
                )}
                <a className="btn btn-ghost" href={resolveMediaUrl("/files/HARSH-RESUME.pdf")} target="_blank" rel="noopener noreferrer">
                  Résumé ↓
                </a>
              </div>
              <p className="mono mono-dim" style={{ marginTop: 26, fontSize: 9.5 }}>
                Details are drawn from the public repository and project record.
              </p>
            </div>
          )}

          {tab === "architecture" && (
            <div>
              <h3>Architecture</h3>
              <p>{project.architecture ?? "Architecture documentation for this module is summarized in the repository README."}</p>
              {project.dataFlow.length > 0 ? (
                <FlowDiagram steps={project.dataFlow} title={project.title} />
              ) : (
                <p className="mono mono-dim">Architecture notes are available in the repository README.</p>
              )}
            </div>
          )}

          {tab === "security" && (
            <div>
              <h3>Security</h3>
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
            </div>
          )}

          {tab === "decisions" && (
            <div>
              <h3>Engineering decisions</h3>
              {project.decisions.length > 0 ? (
                <div className="case-list">
                  {project.decisions.map((d, i) => (
                    <div className="case-list-item" key={i}><span className="n">{String(i + 1).padStart(2, "0")}</span>{d}</div>
                  ))}
                </div>
              ) : (
                <p>Decision records for this project live in the repository history.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <div className="container" style={{ paddingBottom: 90 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>More selected work</div>
          <div className="proj-grid">
            {related.map((p) => (
              <Link to={`/projects/${p.slug}`} className={`proj-node tier-${p.tier}`} key={p.id}>
                <div className="pn-top"><span className="pn-id">{formatTaxonomy(p.category)}</span></div>
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
