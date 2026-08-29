import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../../lib/data";
import { unlock } from "../../lib/achievements";
import { api, resolveMediaUrl } from "../../lib/api";
import { formatTaxonomy } from "../../lib/format";
import type { Project } from "@hp/shared";

function ProjectMedia({ project, compact = false }: { project: Project; compact?: boolean }) {
  return <div className={`project-media${compact ? " compact" : ""}`}>
    {project.heroImage ? <img src={resolveMediaUrl(project.heroImage)} alt="" loading="lazy" /> : <div className="project-art"><span>{formatTaxonomy(project.category).split(" · ")[0]}</span><strong>{project.title.slice(0, 1)}</strong><i /></div>}
    <span className="media-arrow" aria-hidden="true">↗</span>
  </div>;
}

export function Projects() {
  const { projects, error, refresh } = useData();
  const navigate = useNavigate();
  const ordered = useMemo(() => [...projects].sort((a, b) => a.order - b.order), [projects]);
  const flagship = ordered.find((p) => p.tier === "featured") ?? ordered[0];
  const secondary = ordered.filter((p) => p.id !== flagship?.id && (p.tier === "featured" || p.tier === "secondary")).slice(0, 3);
  const remaining = ordered.filter((p) => p.id !== flagship?.id && !secondary.some((s) => s.id === p.id));

  const open = (slug: string) => { unlock("explorer"); void api.track("project_view", slug); navigate(`/projects/${slug}`); };

  if (!flagship) return <section className="section projects-section" id="projects" aria-label="Selected work"><div className="container"><div className="empty-state">{error ? <>Selected work couldn’t load. <button className="text-link" onClick={() => void refresh()}>Try again</button></> : "Selected work is loading…"}</div></div></section>;
  return (
    <section className="section projects-section" id="projects" aria-label="Selected work">
      <div className="container">
        <div className="section-head section-head-inline" data-reveal>
          <div><span className="eyebrow">Selected work</span><h2 className="section-title">A few things I’ve built.</h2></div>
          <p className="section-sub">Systems with a clear purpose, from applied computer vision to tools that make complex information easier to use.</p>
        </div>

        <button className="flagship-project" onClick={() => open(flagship.slug)} data-reveal aria-label={`Open case study: ${flagship.title}`}>
          <ProjectMedia project={flagship} />
          <div className="flagship-copy"><div className="project-meta"><span>01</span><span>{formatTaxonomy(flagship.category)}</span><span>{flagship.year}</span></div><h3>{flagship.title}</h3><p>{flagship.shortDescription}</p><div className="project-bottom"><span>{flagship.stack.slice(0, 4).join(" · ")}</span><b>Read case study <span>↗</span></b></div></div>
        </button>

        <div className="secondary-projects">
          {secondary.map((project, index) => <button className="secondary-project" key={project.id} onClick={() => open(project.slug)} data-reveal data-reveal-delay={String(index * 0.08)} aria-label={`Open case study: ${project.title}`}>
            <ProjectMedia project={project} compact /><div className="secondary-copy"><div className="project-meta"><span>{String(index + 2).padStart(2, "0")}</span><span>{project.year}</span></div><h3>{project.title}</h3><p>{project.shortDescription}</p><span className="text-link">View project ↗</span></div>
          </button>)}
        </div>

        {remaining.length > 0 && <details className="other-work" data-reveal><summary><span>More work</span><span>{remaining.length} projects <i>+</i></span></summary><div className="other-work-list">{remaining.map((project) => <button key={project.id} onClick={() => open(project.slug)}><span>{project.title}</span><small>{formatTaxonomy(project.category)} · {project.year}</small><b>↗</b></button>)}</div></details>}
      </div>
    </section>
  );
}
