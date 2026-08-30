import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useData } from "../../lib/data";
import type { Skill } from "@hp/shared";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState";

/** How many skills to show before the "+N more" reveal — keeps cards balanced. */
const VISIBLE = 9;

function Group({ index, title, intro, skills, onOpen }: { index: number; title: string; intro: string; skills: Skill[]; onOpen: (s: Skill) => void }) {
  const [expanded, setExpanded] = useState(false);
  if (skills.length === 0) return null;

  const visible = expanded ? skills : skills.slice(0, VISIBLE);
  const hidden = skills.length - visible.length;

  return (
    <article className={`capability-card group-${index}`} data-reveal data-reveal-delay={String((index % 3) * 0.06)}>
      <div className="capability-top"><span>0{index + 1}</span><span>{skills.length}</span></div>
      <h3>{title}</h3>
      <p>{intro}</p>
      <div className="capability-skills">
        {visible.map((skill) => (
          <button
            className="skill-link"
            key={skill.id}
            onClick={() => onOpen(skill)}
            aria-label={skill.usedIn.length > 0 ? `${skill.name} — used in ${skill.usedIn.join(", ")}` : skill.name}
          >
            <span className="skill-name">{skill.name}</span>
            {skill.usedIn.length > 0 && <span className="skill-evidence">in {skill.usedIn.slice(0, 2).join(", ")}</span>}
          </button>
        ))}
      </div>
      {hidden > 0 && (
        <button
          className="skill-more"
          aria-expanded={expanded}
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
        >
          {expanded ? "Show less" : `+${hidden} more`}
        </button>
      )}
    </article>
  );
}

/** Capabilities: Core → Strong project experience → Exploring. Evidence-linked. */
export function Capabilities() {
  const { skills, projects, error, refresh } = useData();
  const navigate = useNavigate();

  const openSkill = (skill: Skill) => {
    // Evidence links resolve to the first real project that used the skill.
    if (skill.usedIn.length > 0) {
      const project = projects.find((p) => skill.usedIn.some((u) => p.title.toLowerCase().includes(u.toLowerCase()) || p.slug.includes(u.replace(/\s+/g, "-").toLowerCase())));
      if (project) navigate(`/projects/${project.slug}`);
    }
  };

  const { core, strong, exploring } = useMemo(() => {
    // Rank curated/evidence-bearing skills first within each group so the
    // strongest signals (Java, Node.js, Spring Boot, Docker, …) lead the card.
    const rank = (list: Skill[]) => list.sort((a, b) => (Number(b.featured) - Number(a.featured)) || a.order - b.order);
    const list = [...skills];
    return {
      core: rank(list.filter((s) => s.level === "core")),
      strong: rank(list.filter((s) => s.featured && s.level === "working")),
      exploring: rank(list.filter((s) => s.level === "exploring" || s.level === "experimental")),
    };
  }, [skills]);

  if (skills.length === 0) {
    return (
      <section className="section capabilities-section" id="capabilities" aria-label="Capabilities">
        <div className="container">
          {error ? <ErrorState message="Capabilities couldn't load." onRetry={() => void refresh()} /> : <EmptyState>Capabilities are loading…</EmptyState>}
        </div>
      </section>
    );
  }

  return (
    <section className="section capabilities-section" id="capabilities" aria-label="Capabilities">
      <div className="container">
        <SectionHeader
          eyebrow="Capabilities"
          title="How I work."
          sub="A practical toolkit shaped by real projects — shown in the context where I actually use it."
          inline
        />
        <div className="capability-grid">
          <Group index={0} title="Core" intro="Technologies I reach for by default." skills={core} onOpen={openSkill} />
          <Group index={1} title="Strong project experience" intro="Shipped in real systems, end to end." skills={strong} onOpen={openSkill} />
          <Group index={2} title="Exploring" intro="Growing edge — learning by building." skills={exploring} onOpen={openSkill} />
        </div>
      </div>
    </section>
  );
}