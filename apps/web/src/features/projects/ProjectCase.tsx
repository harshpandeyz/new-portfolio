import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../../lib/api";
import { formatTaxonomy } from "../../lib/format";
import type { Project } from "@hp/shared";
import { unlock } from "../../lib/achievements";
import { useData } from "../../lib/data";
import { Button } from "../../components/ui/Button";
import { IconArrowLeft, IconArrowRight, IconExternal } from "../../components/ui/icons";
import { MobStory, OrchestraStory, QuantumStory, SkillStory } from "../case/stories";

interface ProjectCaseProps {
  onViewResume: () => void;
}

const STORY_INDEX: Record<string, string> = {
  "intelligent-mob-surveillance-system": "01",
  orchestraai: "02",
  quantummind: "03",
  skillmatch: "04",
};

function GenericStory({ project }: { project: Project }) {
  return (
    <>
      {(project.problem || project.solution) && (
        <section className="cs-sec" aria-label="Problem and solution">
          <div className="cs-split">
            {project.problem && <div className="cs-prose"><h3>Problem</h3><p>{project.problem}</p></div>}
            {project.solution && <div className="cs-prose"><h3>Solution</h3><p>{project.solution}</p></div>}
          </div>
        </section>
      )}
      <section className="cs-sec" aria-label="Overview">
        <div className="cs-prose" style={{ maxWidth: 680 }}><h3>Overview</h3><p>{project.longDescription ?? project.shortDescription}</p></div>
      </section>
      {project.architecture && (
        <section className="cs-sec" aria-label="Architecture">
          <div className="cs-prose" style={{ maxWidth: 680 }}><h3>How it runs</h3><p>{project.architecture}</p></div>
        </section>
      )}
      {project.dataFlow.length > 0 && (
        <section className="cs-sec" aria-label="End to end flow">
          <h2 className="cs-sec-title">End-to-end flow</h2>
          <ol className="cs-journey" style={{ marginTop: 16 }}>
            {project.dataFlow.map((s, i) => (
              <li key={i} className="cs-jstep"><span className="jn">{String(i + 1).padStart(2, "0")}</span><div><b>{s.split("→")[0]?.trim()}</b><p>{s.split("→")[1]?.trim()}</p></div></li>
            ))}
          </ol>
        </section>
      )}
      {project.decisions.length > 0 && (
        <section className="cs-sec" aria-label="Engineering decisions">
          <h2 className="cs-sec-title">Engineering decisions</h2>
          <div className="cs-decisions">
            {project.decisions.map((d, i) => (
              <div key={i} className="cs-dec"><span className="n">DECISION {String(i + 1).padStart(2, "0")}</span><p className="t">{d}</p></div>
            ))}
          </div>
        </section>
      )}
      {project.results && (
        <section className="cs-sec" aria-label="Result">
          <div className="cs-prose" style={{ maxWidth: 680 }}><h3>Result</h3><p>{project.results}</p></div>
        </section>
      )}
    </>
  );
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
      void api.track("project_view", project.slug);
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
          <div className="mono mono-dim" style={{ marginBottom: 18 }}>Project not found</div>
          <Link className="btn" to="/#work">← Back to selected work</Link>
        </div>
      </div>
    );
  }

  const storyNo = STORY_INDEX[project.slug];
  const storyLabel = storyNo ? `CASE ${storyNo} / 04` : "CASE STUDY";

  return (
    <div className="subspace" data-tier={project.tier}>
      <div className="container cs-wrap">
        <header className="cs-hero">
          <Link to="/#work" className="back" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28, color: "var(--subs-ink-dim)", fontSize: 12, fontFamily: "var(--font-mono)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
            <IconArrowLeft /> Back to work
          </Link>
          <div className="eyebrow case-eyebrow" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span>{storyLabel}</span><span aria-hidden="true">·</span><span>{formatTaxonomy(project.category)}</span>
          </div>
          <h1>{project.title}</h1>
          {project.codename && <div className="codename" style={{ marginTop: 12 }}>{project.codename}</div>}
          <p className="cs-lede">{project.longDescription ?? project.shortDescription}</p>

          <div className="cs-facts" aria-label="Key facts">
            <div><div className="k">Year</div><div className="v">{project.year}</div></div>
            <div><div className="k">Status</div><div className="v" style={{ textTransform: "capitalize" }}>{project.status}</div></div>
            <div><div className="k">Primary stack</div><div className="v">{project.stack.slice(0, 4).join(" · ")}</div></div>
            <div>
              <div className="k">Links</div>
              <div className="v" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {project.githubUrl && (<a className="btn btn-sm" href={project.githubUrl} target="_blank" rel="noopener noreferrer">GitHub <IconExternal /></a>)}
                {project.liveUrl && (<a className="btn btn-sm btn-solid" href={project.liveUrl} target="_blank" rel="noopener noreferrer">Live <IconExternal /></a>)}
                {!project.githubUrl && !project.liveUrl && <span>Inside the archive</span>}
              </div>
            </div>
          </div>
        </header>

        {project.slug === "intelligent-mob-surveillance-system" && <MobStory project={project} />}
        {project.slug === "orchestraai" && <OrchestraStory project={project} />}
        {project.slug === "quantummind" && <QuantumStory project={project} />}
        {project.slug === "skillmatch" && <SkillStory project={project} />}
        {!["intelligent-mob-surveillance-system", "orchestraai", "quantummind", "skillmatch"].includes(project.slug) && <GenericStory project={project} />}

        <section className="cs-sec" aria-label="Project links">
          <div className="cs-links">
            {project.githubUrl && (<a className="btn" href={project.githubUrl} target="_blank" rel="noopener noreferrer">Source repository <IconExternal /></a>)}
            {project.liveUrl && (<a className="btn btn-solid" href={project.liveUrl} target="_blank" rel="noopener noreferrer">Live deployment <IconExternal /></a>)}
            <Button onClick={onViewResume}>View résumé</Button>
          </div>
          <p className="cs-note">DETAILS DRAWN FROM THE PUBLIC REPOSITORY AND PROJECT RECORD — NOTHING INVENTED.</p>
        </section>
      </div>

      <nav className="case-nav" aria-label="More projects">
        {prev ? (
          <Link to={`/projects/${prev.slug}`} className="case-nav-link" data-tier={prev.tier}>
            <span className="cn-label"><IconArrowLeft /> Previous</span>
            <span className="cn-title">{prev.title}</span>
          </Link>
        ) : (<span />)}
        {next ? (
          <Link to={`/projects/${next.slug}`} className="case-nav-link" data-tier={next.tier}>
            <span className="cn-label">Next <IconArrowRight /></span>
            <span className="cn-title">{next.title}</span>
          </Link>
        ) : (<span />)}
      </nav>
    </div>
  );
}
