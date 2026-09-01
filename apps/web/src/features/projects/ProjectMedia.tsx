import { resolveMediaUrl } from "../../lib/api";
import { formatTaxonomy } from "../../lib/format";
import type { Project } from "@hp/shared";
import * as React from "react";

interface ProjectMediaProps {
  project: Project;
  compact?: boolean;
}

/** Place a label on a circle orbiting `cx,cy` at radius `r`. */
function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

/**
 * Mini topology — the project's stack as a live diagram, so the generated
 * tile reads as a real system spec even before heroImage is uploaded.
 * Center node is the project; orbiting nodes are its primary stack tools.
 */
function NodeMap({ project, max = 4 }: { project: Project; max?: number }) {
  const tools = project.stack.slice(0, max);
  const centerRadius = 26;
  const orbitR = 104;
  const cx = 148;
  const cy = 138;
  const step = tools.length ? 360 / tools.length : 0;

  return (
    <svg
      className="art-nodemap"
      viewBox="0 0 480 280"
      role="presentation"
      aria-hidden="true"
      style={{ width: "100%", height: "100%" }}
    >
      {tools.map((tool, i) => {
        const [x, y] = polar(cx, cy, orbitR, -90 + step * i);
        return (
          <g key={tool}>
            <line
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="var(--tier-color)"
              strokeOpacity="0.34"
              strokeWidth="1.2"
            />
            <circle cx={x} cy={y} r={15} fill="rgba(255,255,255,0.9)" stroke="var(--tier-color)" strokeOpacity="0.55" strokeWidth="1.2" />
            <text
              x={x}
              y={y + 3}
              textAnchor="middle"
              className="art-label"
              style={{ fill: "var(--color-text-muted)" }}
            >
              {tool.length > 11 ? `${tool.slice(0, 10)}…` : tool}
            </text>
          </g>
        );
      })}
      <line x1={cx} y1={cy} x2={cx} y2={cy + centerRadius + 6} stroke="var(--tier-color)" strokeOpacity="0.2" strokeWidth="1.2" />
      <circle className="art-core-glow" cx={cx} cy={cy} r={centerRadius} fill="var(--tier-subtle)" stroke="var(--tier-color)" strokeWidth="1.6" />
      <text x={cx} y={cy + 9} textAnchor="middle" className="art-core-initial" style={{ fill: "var(--tier-color)" }}>
        {project.title.slice(0, 1)}
      </text>
    </svg>
  );
}

/**
 * Consistent media frame for every project card. When heroImage is present
 * it is shown full-bleed; otherwise a designed spec-sheet tile is generated
 * from live project fields (category, tier, stack, year, status, gallery) —
 * real visual proof with no extra data dependencies.
 */
const TIER_LABEL: Record<Project["tier"], string> = {
  featured: "Featured",
  secondary: "Secondary",
  experiment: "Experiment",
  academic: "Academic",
  legacy: "Legacy",
  internship: "Internship",
};

export function ProjectMedia({ project, compact = false }: ProjectMediaProps) {
  const fallback = (
    <div className={`project-art${compact ? " compact-frame" : ""}`} aria-hidden="true" data-tier={project.tier}>
      <div className="art-chrome">
        <span className="art-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="art-url mono-dim mono">sys://{project.slug}</span>
        <span className="art-tier ticker" data-tier={project.tier}>{TIER_LABEL[project.tier]}</span>
      </div>

      <div className="art-main">
        <div className="art-index">
          <span className="ticker ticker-dim">System</span>
          <span className="art-cat">{formatTaxonomy(project.category).split(" · ")[0]}</span>
        </div>
        <div className="art-stage">
          <NodeMap project={project} />
        </div>
      </div>

      <div className="art-foot">
        <span className="ticker ticker-accent">{project.year}</span>
        <span className="ticker ticker-dim">{project.status}</span>
        <span className="art-foot-meta ticker ticker-dim">
          {project.gallery.length > 0 ? `${project.gallery.length} frames` : `${project.stack.length} tools`}
        </span>
      </div>
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