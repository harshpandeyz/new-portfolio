import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useData } from "../../lib/data";
import type { PublicProjectIndex, Skill, SkillCategory } from "@hp/shared";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState";
import { TechGlyph } from "../tech/TechIcons";

const CATEGORY_ORDER: SkillCategory[] = [
  "LANGUAGES", "FRONTEND", "BACKEND", "DATABASES", "AI_ML", "CLOUD_DEVOPS", "SECURITY", "MOBILE", "BLOCKCHAIN", "EXPERIMENTAL",
];

const CATEGORY_META: Record<SkillCategory, { title: string; intro: string }> = {
  LANGUAGES: { title: "Languages", intro: "The dialects I think in." },
  FRONTEND: { title: "Frontend & Web", intro: "Interfaces that respect the reader." },
  BACKEND: { title: "Backend & APIs", intro: "The part nobody sees — where the real work lives." },
  DATABASES: { title: "Data & Databases", intro: "Schema, query, and stored truth." },
  AI_ML: { title: "AI / ML Platform", intro: "Grounded generation over private knowledge." },
  CLOUD_DEVOPS: { title: "Cloud & DevOps", intro: "Ships clean, runs without surprises." },
  SECURITY: { title: "Security & Reliability", intro: "Evidence you can prove, not just promise." },
  MOBILE: { title: "Mobile & Native", intro: "Beyond the browser when it counts." },
  BLOCKCHAIN: { title: "Blockchain", intro: "Distributed records and verifiable state." },
  EXPERIMENTAL: { title: "Experimental", intro: "New tools, tested with intent." },
};

function SkillTile({ skill, onOpen, linkedProjects }: { skill: Skill; onOpen: (s: Skill) => void; linkedProjects: PublicProjectIndex[] }) {
  const context = skill.relatedConcepts.slice(0, 2).join(" · ");
  if (linkedProjects.length === 0) {
    return (
      <div className="tech-tile tech-tile--static" title={context || skill.name} aria-label={skill.name}>
        <TechGlyph name={skill.name} />
        <span className="tt-name">{skill.name}</span>
        {context && (
          <span className="tt-meta" aria-hidden="true">
            {context}
          </span>
        )}
      </div>
    );
  }
  return (
    <button
      className="tech-tile"
      data-level={skill.level}
      onClick={() => onOpen(skill)}
      title={context || skill.name}
      aria-label={`${skill.name} — used in ${linkedProjects.map((project) => project.title).join(", ")}`}
    >
      <TechGlyph name={skill.name} />
      <span className="tt-name">{skill.name}</span>
      {context && (
        <span className="tt-meta" aria-hidden="true">
          {context}
        </span>
      )}
    </button>
  );
}

export function TechStack() {
  const { skills, projectIndex, error, refresh } = useData();
  const navigate = useNavigate();

  const domainData = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      ...CATEGORY_META[category],
      category,
      items: skills
        .filter((skill) => skill.category === category)
        .sort((a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order),
    })).filter((d) => d.items.length > 0);
  }, [skills]);

  const totalDisplayed = useMemo(() => domainData.reduce((n, d) => n + d.items.length, 0), [domainData]);

  const projectsBySlug = useMemo(() => new Map(projectIndex.map((project) => [project.slug, project])), [projectIndex]);
  const linkedProjectsBySkill = useMemo(() => new Map(
    skills.map((skill) => [skill.id, (skill.usedInProjectSlugs ?? []).map((slug) => projectsBySlug.get(slug)).filter((project): project is PublicProjectIndex => Boolean(project))]),
  ), [skills, projectsBySlug]);

  const openSkill = (skill: Skill) => {
    const project = linkedProjectsBySkill.get(skill.id)?.[0];
    if (project) navigate(`/projects/${project.slug}`);
  };

  return (
    <section className="section tech-section" id="tech" aria-label="Technology stack">
      <div className="container">
        <SectionHeader
          eyebrow="Tech"
          title={`${totalDisplayed} capabilities, ${domainData.length} domains.`}
          sub="Every capability comes from the current portfolio record. Open a skill to see the work it connects to."
          inline
        />

        {domainData.length > 0 ? (
          <div className="tech-grid tech-grid--taxonomy">
            {domainData.map((domain, index) => (
              <article className="tech-card" key={domain.title}>
                <header className="tech-card-head">
                  <span className="tech-num">{String(index + 1).padStart(2, "0")}</span>
                  <h3>{domain.title}</h3>
                  <span className="tech-count" aria-label={`${domain.items.length} skills`}>
                    {domain.items.length}
                  </span>
                </header>
                <p className="tech-intro">{domain.intro}</p>
                <div className="tech-tiles">
                  {domain.items.map((skill) => (
                    <SkillTile key={skill.id} skill={skill} onOpen={openSkill} linkedProjects={linkedProjectsBySkill.get(skill.id) ?? []} />
                  ))}
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
