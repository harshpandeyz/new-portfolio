import type { Project } from "@hp/shared";
import { formatTaxonomy } from "../../lib/format";
import { ProjectMedia } from "./ProjectMedia";
import { IconArrowRight } from "../../components/ui/icons";

interface ProjectCardProps {
  project: Project;
  index: number;
  onOpen: (slug: string) => void;
}

/** Standard project card: type · year, title, outcome, tags, case-study CTA. */
export function ProjectCard({ project, index, onOpen }: ProjectCardProps) {
  return (
    <button
      className="project-card"
      onClick={() => onOpen(project.slug)}
      data-reveal
      data-reveal-delay={String((index % 3) * 0.08)}
      aria-label={`Open case study: ${project.title}`}
    >
      <ProjectMedia project={project} />
      <div className="project-card-body">
        <div className="project-meta">
          <span>{String(index + 1).padStart(2, "0")}</span>
          <span>{formatTaxonomy(project.category)}</span>
          <span>{project.year}</span>
        </div>
        <h3 className="project-card-title">{project.title}</h3>
        <p className="project-card-desc">{project.shortDescription}</p>
        {project.stack.length > 0 && (
          <div className="project-card-tags">
            {project.stack.slice(0, 4).map((tag) => (
              <span className="tag" key={tag}>{tag}</span>
            ))}
          </div>
        )}
        <span className="project-card-link">
          View case study <IconArrowRight />
        </span>
      </div>
    </button>
  );
}