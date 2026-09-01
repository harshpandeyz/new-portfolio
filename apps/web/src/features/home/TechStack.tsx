import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useData } from "../../lib/data";
import type { Skill } from "@hp/shared";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState";
import { TechGlyph } from "../tech/TechIcons";

type DomainCategory = "FRONTEND" | "BACKEND" | "LANGUAGES" | "AI_ML" | "DATABASES" | "CLOUD_DEVOPS" | "MOBILE" | "SECURITY" | "EXPERIMENTAL";

const DOMAINS: { title: string; intro: string; categories: DomainCategory[] }[] = [
  { title: "Frontend & Web", intro: "Interfaces that respect the people using them.", categories: ["FRONTEND"] },
  { title: "Backend & Languages", intro: "The part nobody sees, where the real work lives.", categories: ["BACKEND", "LANGUAGES"] },
  { title: "AI / ML", intro: "Applied models with honest evaluation.", categories: ["AI_ML"] },
  { title: "Data & Databases", intro: "Schema, query, and stored work.", categories: ["DATABASES"] },
  { title: "Cloud & DevOps", intro: "Ships clean and runs without surprises.", categories: ["CLOUD_DEVOPS"] },
  { title: "Mobile & Native", intro: "Beyond the browser when it counts.", categories: ["MOBILE"] },
  { title: "Tools & Security", intro: "The discipline layer.", categories: ["SECURITY", "EXPERIMENTAL"] },
];

function SkillTile({ skill, onOpen }: { skill: Skill; onOpen: (s: Skill) => void }) {
  const context = skill.relatedConcepts.slice(0, 3).join(" · ");
  return (
    <button
      className="tech-tile"
      data-level={skill.level}
      onClick={() => onOpen(skill)}
      title={context || skill.name}
      aria-label={skill.usedIn.length > 0 ? `${skill.name} — used in ${skill.usedIn.join(", ")}` : skill.name}
    >
      <TechGlyph name={skill.name} />
      <span className="tt-name">{skill.name}</span>
      <span className="tt-role" aria-hidden="true">{context}</span>
    </button>
  );
}

/** Tech Stack: a multidomain grid, every entry linked to real evidence. */
export function TechStack() {
  const { skills, projects, error, refresh } = useData();
  const navigate = useNavigate();

  const byDomain = useMemo(() => {
    const ranked = [...skills].sort(
      (a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order,
    );
    return DOMAINS.map((domain) => ({
      ...domain,
      skills: ranked.filter((s) => domain.categories.includes(s.category as DomainCategory)),
    })).filter((d) => d.skills.length > 0);
  }, [skills]);

  const openSkill = (skill: Skill) => {
    if (skill.usedIn.length === 0) return;
    const project = projects.find((p) =>
      skill.usedIn.some(
        (u) => p.title.toLowerCase().includes(u.toLowerCase()) || p.slug.includes(u.replace(/\s+/g, "-").toLowerCase()),
      ),
    );
    if (project) navigate(`/projects/${project.slug}`);
  };

  return (
    <section className="section tech-section" id="tech" aria-label="Technology stack">
      <div className="container">
        <SectionHeader
          eyebrow="Tech"
          title="The toolkit, by domain."
          sub="Practical skills learned by shipping — every entry is tied to work you can open."
          inline
        />

        {byDomain.length > 0 ? (
          <div className="tech-grid">
            {byDomain.map((domain, index) => (
              <article className="tech-card" key={domain.title} data-reveal data-reveal-delay={String((index % 3) * 0.06)}>
                <header className="tech-card-head">
                  <span className="tech-num">{(index + 1).toString().padStart(2, "0")}</span>
                  <h3>{domain.title}</h3>
                  <span className="tech-count">{domain.skills.length}</span>
                </header>
                <p className="tech-intro">{domain.intro}</p>
                <div className="tech-tiles">
                  {domain.skills.map((skill) => <SkillTile key={skill.id} skill={skill} onOpen={openSkill} />)}
                </div>
              </article>
            ))}
          </div>
        ) : error ? (
          <ErrorState message="Technology stack couldn't load." onRetry={() => void refresh()} />
        ) : (
          <EmptyState>Technology stack is loading…</EmptyState>
        )}
      </div>
    </section>
  );
}