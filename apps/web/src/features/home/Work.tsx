import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useData } from "../../lib/data";
import { unlock } from "../../lib/achievements";
import { api } from "../../lib/api";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState";
import { FlagshipProject } from "../projects/FlagshipProject";
import { ProjectCard } from "../projects/ProjectCard";

export function Work() {
  const { projects, error, refresh } = useData();
  const navigate = useNavigate();

  const ordered = useMemo(() => [...projects].sort((a, b) => a.order - b.order), [projects]);

  const flagship = ordered.find((p) => p.tier === "featured") ?? ordered[0];

  const selected = ordered
    .filter((p) => p.slug !== flagship?.slug && (p.tier === "featured" || p.tier === "secondary"))
    .slice(0, 2);

  const compact = ordered
    .filter((p) => p.slug !== flagship?.slug && !selected.some((s) => s.slug === p.slug))
    .slice(0, 4);

  const open = (slug: string) => {
    unlock("explorer");
    void api.track("project_view", slug);
    navigate(`/projects/${slug}`);
  };

  if (!flagship) {
    return (
      <section className="section work-section" id="work" aria-label="Selected work">
        <div className="container">
          {error ? <ErrorState message="Selected work couldn't load." onRetry={() => void refresh()} /> : <EmptyState>Selected work is loading…</EmptyState>}
        </div>
      </section>
    );
  }

  return (
    <section className="section work-section" id="work" aria-label="Selected work">
      <div className="container">
        <SectionHeader
          eyebrow="Selected work"
          title="Systems, not slogans."
          sub="Flagship first — visual, verifiable, built end to end. Secondary work stays compact."
          inline
        />

        <div className="work-flagship">
          <FlagshipProject project={flagship} onOpen={open} />
        </div>

        <div className="work-row">
          {selected.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index + 1} onOpen={open} compact />
          ))}
          <button
            className="project-card project-card--compact project-card--archive explore-card"
            onClick={() => navigate("/projects")}
            data-reveal
            data-reveal-delay="0.12"
            aria-label="Open the full project archive"
          >
            <div className="project-card-visual project-card-visual--archive" aria-hidden="true">
              <div className="archive-visual">
                <span className="archive-num">{String(selected.length + 2).padStart(2, "0")}</span>
                <span className="archive-kicker">More work</span>
                <span className="archive-meta">{projects.length} projects · filterable</span>
              </div>
            </div>
            <div className="project-card-body">
              <div className="project-meta">
                <span>{String(selected.length + 2).padStart(2, "0")}</span>
                <span>Archive</span>
                <span>{projects.length} total</span>
              </div>
              <h3 className="project-card-title">Explore the archive</h3>
              <p className="project-card-desc">All tiers · filterable · honest scopes.</p>
              <span className="project-card-link">
                Open archive <span aria-hidden="true">→</span>
              </span>
            </div>
          </button>
        </div>

        {compact.length > 0 && (
          <div className="work-list" aria-label="More projects">
            {compact.map((project, i) => (
              <div className="work-list-item" key={project.id} data-reveal data-reveal-delay={String(i * 0.04)}>
                <button className="work-list-open" onClick={() => open(project.slug)} aria-label={`Open case study: ${project.title}`}>
                  <span className="work-list-num" aria-hidden="true">{String(i + selected.length + 3).padStart(2, "0")}</span>
                  <span className="work-list-main">
                    <span className="work-list-title">{project.title}</span>
                    <span className="work-list-desc">{project.shortDescription}</span>
                  </span>
                  <span className="work-list-arrow" aria-hidden="true">→</span>
                </button>
                {project.githubUrl && (
                  <a className="work-list-repo" href={project.githubUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                    GitHub ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
