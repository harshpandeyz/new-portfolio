import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../../lib/api";
import { applyMeta } from "../../lib/seo";
import { SEO } from "../../app/constants";
import { formatTaxonomy } from "../../lib/format";
import type { Project } from "@hp/shared";
import { unlock } from "../../lib/achievements";
import { useData } from "../../lib/data";
import { Button } from "../../components/ui/Button";
import { IconArrowLeft, IconArrowRight, IconExternal } from "../../components/ui/icons";
import { CctvStory, OrchestraStory, QuantumStory, SkillStory } from "../case/stories";
import { Canvas, PipeFlow, SecurityStrip } from "../case/visuals";

interface ProjectCaseProps {
  onViewResume: () => void;
}

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
          <Canvas kicker="IMPLEMENTED FLOW" right={`${project.dataFlow.length} stages`} caption="The sequence is taken from the project record; details are intentionally omitted when the repository does not document them.">
            <PipeFlow nodes={project.dataFlow.slice(0, 8).map((step, index) => {
              const [label, sub] = step.split("→");
              return { label: label?.trim() || `Stage ${index + 1}`, sub: sub?.trim() || "recorded stage", icon: ["camera", "brain", "api", "database", "evidence", "ledger", "attest", "web"][index] };
            })} />
          </Canvas>
          <ol className="cs-journey" style={{ marginTop: 16 }}>
            {project.dataFlow.map((s, i) => {
              const [head, tail] = s.split("→");
              const label = head?.trim() || `Stage ${i + 1}`;
              const sub = tail?.trim();
              return (
                <li key={i} className="cs-jstep"><span className="jn">{String(i + 1).padStart(2, "0")}</span><div><b>{label}</b>{sub ? <p>{sub}</p> : null}</div></li>
              );
            })}
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
      {(project.challenges || project.securityNotes) && (
        <section className="cs-sec" aria-label="Limitations and security">
          <div className="cs-split">
            {project.challenges && <div className="cs-prose"><h3>Limitations / challenge</h3><p>{project.challenges}</p></div>}
            {project.securityNotes && <div className="cs-prose"><h3>Security posture</h3><SecurityStrip items={project.securityNotes.split(" · ")} /></div>}
          </div>
        </section>
      )}
      <section className="cs-sec" aria-label="Technology used">
        <h2 className="cs-sec-title">Technology used</h2>
        <div className="cs-secgrid">{project.stack.map((technology) => <span className="cs-secbadge" key={technology}>{technology}</span>)}</div>
      </section>
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
    if (!slug) {
      setProject(null);
      setNotFound(true);
      setLoading(false);
      return () => {
        live = false;
      };
    }
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
        .project(slug)
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
      applyMeta({
        title: `${project.title} — Harsh Pandey`,
        description: project.shortDescription,
        url: `${SEO.siteUrl}/projects/${project.slug}`,
        image: project.heroImage ?? undefined,
      });
      unlock("explorer");
      void api.track("project_view", project.slug);
    }
    return () => {
      applyMeta({ title: SEO.title, description: SEO.description, url: SEO.siteUrl, image: undefined });
    };
  }, [project]);

  const { prev, next, orderedProjects } = useMemo(() => {
    const ordered = [...projects].sort((a, b) => a.order - b.order);
    const idx = project ? ordered.findIndex((p) => p.id === project.id) : -1;
    return {
      orderedProjects: ordered,
      prev: idx > 0 ? ordered[idx - 1] ?? null : null,
      next: idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] ?? null : null,
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

  const storyNo = orderedProjects.findIndex((item) => item.id === project.id) + 1;
  const storyLabel = storyNo > 0
    ? `CASE ${String(storyNo).padStart(2, "0")} / ${String(orderedProjects.length).padStart(2, "0")}`
    : "CASE STUDY";

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

        {project.slug === "intelligent-surveillance-system" && <CctvStory project={project} />}
        {project.slug === "orchestraai" && <OrchestraStory project={project} />}
        {project.slug === "quantummind" && <QuantumStory project={project} />}
        {project.slug === "skillmatch" && <SkillStory project={project} />}
        {!["intelligent-surveillance-system", "orchestraai", "quantummind", "skillmatch"].includes(project.slug) && <GenericStory project={project} />}

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
