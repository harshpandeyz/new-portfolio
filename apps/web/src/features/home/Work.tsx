import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useData } from "../../lib/data";
import { unlock } from "../../lib/achievements";
import { api } from "../../lib/api";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState";
import { FlagshipProject } from "../projects/FlagshipProject";
import { ProjectCard } from "../projects/ProjectCard";

function ArchiveVisual({ total }: { total: number }) {
  const nodes = useMemo(() => {
    const pts: { x: number; y: number; r: number; o: number }[] = [
      { x: 12, y: 30, r: 3.4, o: 0.95 }, { x: 26, y: 62, r: 2.2, o: 0.7 },
      { x: 38, y: 26, r: 2.6, o: 0.8 }, { x: 50, y: 55, r: 4, o: 1 },
      { x: 62, y: 24, r: 2.2, o: 0.7 }, { x: 74, y: 58, r: 3, o: 0.9 },
      { x: 86, y: 30, r: 2.2, o: 0.7 }, { x: 68, y: 82, r: 2, o: 0.6 },
      { x: 44, y: 84, r: 2.4, o: 0.7 }, { x: 20, y: 88, r: 1.8, o: 0.55 },
      { x: 92, y: 78, r: 2.6, o: 0.8 }, { x: 32, y: 46, r: 1.6, o: 0.5 },
    ];
    return pts;
  }, []);
  const W = 320; const H = 150;
  const P = (n: { x: number; y: number }) => `${(n.x / 100) * W},${(n.y / 100) * H}`;
  const links: [number, number][] = [[0, 2], [2, 3], [3, 5], [5, 6], [3, 4], [1, 7], [7, 8], [8, 3], [5, 10], [7, 9], [11, 3]];
  return (
    <div className="sw-const" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        {links.map(([a, b], i) => (
          <line key={i} x1={(nodes[a]!.x / 100) * W} y1={(nodes[a]!.y / 100) * H} x2={(nodes[b]!.x / 100) * W} y2={(nodes[b]!.y / 100) * H} stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
        ))}
        {nodes.map((n, i) => (
          <g key={i}>
            <circle cx={(n.x / 100) * W} cy={(n.y / 100) * H} r={n.r + 4} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            <circle cx={(n.x / 100) * W} cy={(n.y / 100) * H} r={n.r} fill="#0071e3" opacity={n.o} />
          </g>
        ))}
        <text x={8} y={16} fill="rgba(238,242,249,0.55)" fontSize="9" fontFamily="monospace" letterSpacing="2">PROJECT MAP · {P(nodes[0]!)} </text>
      </svg>
      <div className="sw-stacklayers" aria-hidden="true"><i style={{ height: 26 }} /><i style={{ height: 36 }} /><i style={{ height: 48 }} /><i style={{ height: 60 }} /></div>
      <div className="sw-arch-count"><b>{String(total).padStart(2, "0")}</b><span>PROJECTS</span></div>
    </div>
  );
}

export function Work() {
  const { projects, error, refresh } = useData();
  const navigate = useNavigate();

  const ordered = useMemo(() => [...projects].sort((a, b) => a.order - b.order), [projects]);

  const getBySlug = useMemo(() => {
    const map = new Map(ordered.map(p => [p.slug, p]));
    return (slug: string) => map.get(slug) ?? null;
  }, [ordered]);

  const flagship1 = getBySlug("intelligent-mob-surveillance-system");
  const flagship2 = getBySlug("orchestraai");
  const secondary1 = getBySlug("quantummind");
  const secondary2 = getBySlug("skillmatch");

  const open = (slug: string) => {
    unlock("explorer");
    void api.track("project_view", slug);
    navigate(`/projects/${slug}`);
  };

  if (!flagship1 || !flagship2) {
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
          title="Systems I’ve built, shipped, and explored"
          sub="Two flagships, two focused systems — then the full archive."
          inline
        />
        <div className="sw-head-rule" aria-hidden="true"><span><strong>01 — 02</strong> · FLAGSHIP SYSTEMS</span><span>DEPTH OVER QUANTITY</span></div>
        <div className="sw-flag-grid">
          <FlagshipProject project={flagship1} onOpen={open} />
          <FlagshipProject project={flagship2} onOpen={open} />
        </div>

        <div className="sw-row-label" aria-hidden="true"><span><b>03 — 05</b> · FOCUSED WORK + ARCHIVE</span></div>
        <div className="sw-sec-grid">
          {secondary1 && <ProjectCard key={secondary1.id} project={secondary1} index={2} onOpen={open} />}
          {secondary2 && <ProjectCard key={secondary2.id} project={secondary2} index={3} onOpen={open} />}
          <article className="sw-archive" data-reveal data-reveal-delay="0.16" aria-label="View more projects — archive">
            <ArchiveVisual total={projects.length} />
            <div className="sw-archive-body">
              <div className="project-meta" style={{ color: "rgba(238,242,249,0.6)" }}><span>05</span><span>Archive</span><span>{projects.length} total</span></div>
              <h3>View More Projects</h3>
              <p>Explore the full project archive — experiments, academic builds and internship work.</p>
              <button className="sw-viewall" onClick={() => navigate("/projects")} aria-label="Open project archive" style={{ padding: 0 }}>
                View All <span className="sw-arrow" aria-hidden="true">→</span>
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
