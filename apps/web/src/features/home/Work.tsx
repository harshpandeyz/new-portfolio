import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useData } from "../../lib/data";
import { unlock } from "../../lib/achievements";
import { api } from "../../lib/api";
import type { Project } from "@hp/shared";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState";
import { FlagshipProject } from "../projects/FlagshipProject";
import { ProjectCard } from "../projects/ProjectCard";
import { IconArrowRight } from "../../components/ui/icons";
import { SURVEILLANCE_EVOLUTION, EvolutionStory } from "../projects/EvolutionStory";

const ARCHIVE_FILTERS = ["All", "Backend", "AI / ML", "Full Stack", "Mobile", "Experiments", "Academic"] as const;
type ArchiveFilter = (typeof ARCHIVE_FILTERS)[number];

function matchesFilter(p: Project, filter: ArchiveFilter): boolean {
  switch (filter) {
    case "All":
      return true;
    case "Backend":
      return /backend|spring|fastapi|node|api|docker/i.test(p.category);
    case "AI / ML":
      return /ai|vision|nlp|rag|ml|mlops|search/i.test(p.category);
    case "Full Stack":
      return /full-stack|fullstack|platform|social/i.test(p.category);
    case "Mobile":
      return /mobile|ios|android/i.test(p.category);
    case "Academic":
      return p.tier === "academic";
    case "Experiments":
      return p.tier === "experiment" || p.tier === "legacy" || p.tier === "internship";
    default:
      return true;
  }
}

function formatCategory(cat: string): string {
  return cat.split(" / ")[0]?.toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) ?? cat;
}

export function Work() {
  const { projects, error, refresh } = useData();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ArchiveFilter>("All");

  const ordered = useMemo(() => [...projects].sort((a, b) => a.order - b.order), [projects]);

  // Flagship + the three strongest distinct works make up "Selected work".
  // The flagship's evolution predecessor is already presented in the nearby
  // evolution story, so it stays out of the card grid (and archive) to avoid
  // showing the same project twice with equal visual weight.
  const flagships = ordered.find((p) => p.tier === "featured") ?? ordered[0];
  const evolutionSlugs = SURVEILLANCE_EVOLUTION ? [SURVEILLANCE_EVOLUTION.from, SURVEILLANCE_EVOLUTION.to] : [];
  const evolved = flagships && evolutionSlugs.includes(flagships.slug) ? flagships : null;
  const flagship = evolved ?? flagships;

  const excluded = new Set<string>([flagship?.slug, ...new Set(evolutionSlugs)].filter((s): s is string => Boolean(s)));
  const featured = ordered
    .filter((p) => !excluded.has(p.slug) && (p.tier === "featured" || p.tier === "secondary"))
    .slice(0, 3);
  const archive = ordered.filter((p) => !excluded.has(p.slug) && !featured.some((s) => s.id === p.id));
  const filteredArchive = archive.filter((p) => matchesFilter(p, filter));

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
          sub="Software with a clear purpose — from applied computer vision to tools that make complex information easier to use."
          inline
        />

        <div className="work-flagship">
          <FlagshipProject project={flagship} onOpen={open} />
          {SURVEILLANCE_EVOLUTION && (
            <EvolutionStory
              evolution={SURVEILLANCE_EVOLUTION}
              onOpen={open}
              onProject={open}
            />
          )}
        </div>

        <div className="secondary-projects">
          {featured.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index + 1} onOpen={open} />
          ))}
        </div>

        {archive.length > 0 && (
          <div className="work-archive" data-reveal>
            <div className="archive-head">
              <div>
                <span className="eyebrow">Archive</span>
                <h2>More work</h2>
              </div>
              <div className="archive-filters" role="group" aria-label="Filter more work">
                {ARCHIVE_FILTERS.map((f) => (
                  <button
                    key={f}
                    className={`archive-filter${filter === f ? " active" : ""}`}
                    aria-pressed={filter === f}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="archive-list">
              {filteredArchive.map((project) => (
                <button className="archive-item" key={project.id} onClick={() => open(project.slug)}>
                  <span className="archive-item-title">{project.title}</span>
                  <span className="archive-item-meta">{formatCategory(project.category)} · {project.year}</span>
                  <IconArrowRight className="archive-item-arrow" />
                </button>
              ))}
              {filteredArchive.length === 0 && <EmptyState>No projects in this category.</EmptyState>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}