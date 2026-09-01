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

  // One flagship, then two selected cards, then the compact tail. Each piece
  // has one job; no project appears twice with equal visual weight.
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
          title="A few systems I've built."
          sub="Applied computer vision, ranked search, and tools that make complex information easier to work with."
          inline
        />

        <div className="work-flagship">
          <FlagshipProject project={flagship} onOpen={open} />
        </div>

        <div className="work-row">
          {selected.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index + 1} onOpen={open} />
          ))}
          <button className="explore-card" onClick={() => navigate("/projects")} data-reveal data-reveal-delay="0.12" aria-label="Open the full project archive">
            <span className="explore-num" aria-hidden="true">{String(selected.length + 2).padStart(2, "0")}</span>
            <span className="explore-text">
              <span className="explore-title">Explore the archive</span>
              <span className="explore-sub">Every project, filterable by tier and domain.</span>
            </span>
            <span className="explore-order">More work <span aria-hidden="true">→</span></span>
          </button>
        </div>

        {compact.length > 0 && (
          <div className="work-list">
            {compact.map((project, i) => (
              <div
                className="work-list-item"
                key={project.id}
                data-reveal
                data-reveal-delay={String(i * 0.05)}
              >
                <button className="work-list-open" onClick={() => open(project.slug)} aria-label={`Open case study: ${project.title}`}>
                  <span className="work-list-num" aria-hidden="true">{String(i + selected.length + 3).padStart(2, "0")}</span>
                  <span className="work-list-main">
                    <span className="work-list-title">{project.title}</span>
                    <span className="work-list-desc">{project.shortDescription}</span>
                  </span>
                  <span className="work-list-arrow" aria-hidden="true">→</span>
                </button>
                {project.githubUrl && (
                  <a
                    className="work-list-repo"
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
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