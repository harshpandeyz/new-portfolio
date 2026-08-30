import { resolveMediaUrl } from "../../lib/api";
import { formatTaxonomy } from "../../lib/format";
import type { Project } from "@hp/shared";
import * as React from "react";

interface ProjectMediaProps {
  project: Project;
  compact?: boolean;
}

/**
 * Consistent media frame for every project card — correct aspect ratio,
 * graceful fallback (generated tile), lazy loading, no stretched screenshots.
 * When heroImage fails to load, the fallback tile is shown automatically.
 */
export function ProjectMedia({ project, compact = false }: ProjectMediaProps) {
  const fallback = (
    <div className="project-art" aria-hidden="true">
      <span>{formatTaxonomy(project.category).split(" · ")[0]}</span>
      <strong>{project.title.slice(0, 1)}</strong>
      <i />
    </div>
  );

  const [errored, setErrored] = React.useState(false);

  return (
    <div className={`project-media${compact ? " compact" : ""}`}>
      {project.heroImage ? (
        <>
          <img
            src={resolveMediaUrl(project.heroImage)}
            alt={`${project.title} preview`}
            loading="lazy"
            width={1280}
            height={720}
            hidden={errored}
            onError={() => { setErrored(true); }}
            onLoad={() => { setErrored(false); }}
          />
          {errored && fallback}
        </>
      ) : (
        fallback
      )}
    </div>
  );
}