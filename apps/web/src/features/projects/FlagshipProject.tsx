import type { Project } from "@hp/shared";
import { formatTaxonomy } from "../../lib/format";
import { ProjectMedia } from "./ProjectMedia";
import { IconArrowRight } from "../../components/ui/icons";

interface FlagshipProjectProps {
  project: Project;
  onOpen: (slug: string) => void;
}

/** The flagship: the strongest work, full-width, with room to breathe. */
export function FlagshipProject({ project, onOpen }: FlagshipProjectProps) {
  return (
    <button className="flagship-project" onClick={() => onOpen(project.slug)} data-reveal aria-label={`Open case study: ${project.title}`}>
      <ProjectMedia project={project} />
      <div className="flagship-copy">
        <div className="project-meta">
          <span>01</span>
          <span>{formatTaxonomy(project.category)}</span>
          <span>{project.year}</span>
        </div>
        <h3 className="flagship-title">{project.title}</h3>
        {project.codename && <div className="codename">{project.codename}</div>}
        <p className="flagship-desc">{project.shortDescription}</p>
        {project.stack.length > 0 && (
          <div className="project-card-tags">
            {project.stack.slice(0, 5).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
          </div>
        )}
        <span className="project-card-link">
          Read case study <IconArrowRight />
        </span>
      </div>
    </button>
  );
}