import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useData } from "../../lib/data";
import type { Skill } from "@hp/shared";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState";
import { TechGlyph } from "../tech/TechIcons";

/*
 * Tech information architecture — exactly 9 domains, max 8 skills each,
 * no duplication across cards. Every skill appears in exactly one domain.
 *
 * Data comes from the verified seed inventory (50 skills). The domain
 * assignment below is semantic-normalized: e.g. SQL lives in Data &
 * Databases not Languages; Authentication & RBAC live in Security not
 * Backend.
 */

type Domain = { title: string; intro: string; skills: string[] };

const DOMAINS: Domain[] = [
  {
    title: "Languages",
    intro: "The dialects I think in.",
    skills: ["Java", "Python", "JavaScript", "TypeScript", "C++", "Swift", "Kotlin", "Solidity"],
  },
  {
    title: "Frontend & Web",
    intro: "Interfaces that respect the reader.",
    skills: ["React.js", "HTML5 / CSS3", "Vite"],
  },
  {
    title: "Backend & APIs",
    intro: "The part nobody sees — where the real work lives.",
    skills: ["Node.js", "Express.js", "Spring Boot", "FastAPI", "REST API design", "MVC architecture"],
  },
  {
    title: "Data & Databases",
    intro: "Schema, query, and stored truth.",
    skills: ["MySQL", "PostgreSQL", "MongoDB", "Firebase", "Database design", "SQL"],
  },
  {
    title: "AI / ML Platform",
    intro: "Grounded generation over private knowledge.",
    skills: ["RAG", "FAISS / vector search", "LLM API integration", "Machine Learning fundamentals", "MLOps"],
  },
  {
    title: "Computer Vision",
    intro: "Pixels to understanding, in real time.",
    skills: ["Computer Vision", "YOLOv8", "OpenCV", "MediaPipe"],
  },
  {
    title: "Cloud & DevOps",
    intro: "Ships clean, runs without surprises.",
    skills: ["Docker & Compose", "Jenkins", "CI/CD", "Git / GitHub", "Caddy", "Cloud fundamentals", "Postman"],
  },
  {
    title: "Security & Reliability",
    intro: "Evidence you can prove, not just promise.",
    skills: [
      "Authentication & JWT",
      "RBAC",
      "Evidence integrity (AES/SHA-256)",
      "Blockchain anchoring",
      "Web security practices",
      "Networking fundamentals",
      "Distributed systems",
      "Selenium / test automation",
    ],
  },
  {
    title: "Mobile & Native",
    intro: "Beyond the browser when it counts.",
    skills: ["Android (Kotlin)", "iOS (Swift/UIKit)", "React Native"],
  },
];

function SkillTile({ skill, onOpen, interactive }: { skill: Skill; onOpen: (s: Skill) => void; interactive: boolean }) {
  const context = skill.relatedConcepts.slice(0, 2).join(" · ");
  if (!interactive) {
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
      aria-label={`${skill.name} — used in ${skill.usedIn.join(", ")}`}
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
  const { skills, projects, error, refresh } = useData();
  const navigate = useNavigate();

  const domainData = useMemo(() => {
    // Map normalized name → skill for O(1)
    const byName = new Map<string, Skill>();
    for (const s of skills) byName.set(s.name.trim().toLowerCase(), s);

    return DOMAINS.map((domain) => {
      const items: Skill[] = [];
      for (const name of domain.skills) {
        const hit = byName.get(name.trim().toLowerCase());
        if (hit) items.push(hit);
      }
      // Sort featured first then order
      items.sort((a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order);
      // Safety: cap at 8 per spec — taxonomy must not overflow card
      if (items.length > 8) items.length = 8;
      return { ...domain, items };
    }).filter((d) => d.items.length > 0);
  }, [skills]);

  const totalDisplayed = useMemo(() => domainData.reduce((n, d) => n + d.items.length, 0), [domainData]);

  const isInteractive = useMemo(() => {
    const interactiveIds = new Set<string>();
    for (const d of domainData) {
      for (const s of d.items) if (s.usedIn.length > 0) interactiveIds.add(s.id);
    }
    return (skill: Skill) => interactiveIds.has(skill.id);
  }, [domainData]);

  const openSkill = (skill: Skill) => {
    if (skill.usedIn.length === 0) return;
    const project = projects.find((p) =>
      skill.usedIn.some(
        (u) => p.title.toLowerCase().includes(u.toLowerCase()) || p.slug.includes(u.replace(/\s+/g, "-").toLowerCase()),
      ),
    );
    if (project) navigate(`/projects/${project.slug}`);
  };

  const wordFor = (n: number) => {
    const words: Record<number, string> = { 50: "Fifty", 49: "Forty-nine", 48: "Forty-eight", 51: "Fifty-one", 52: "Fifty-two" };
    return words[n] ?? String(n);
  };

  return (
    <section className="section tech-section" id="tech" aria-label="Technology stack">
      <div className="container">
        <SectionHeader
          eyebrow="Tech"
          title={`${wordFor(totalDisplayed)} capabilities, nine domains.`}
          sub={`No duplicate entries. Every skill appears once — ${totalDisplayed} shown, balanced so no single card dominates.`}
          inline
        />

        {domainData.length > 0 ? (
          <div className="tech-grid tech-grid--nine">
            {domainData.map((domain, index) => (
              <article className="tech-card" key={domain.title} data-reveal data-reveal-delay={String((index % 3) * 0.06)}>
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
                    <SkillTile key={skill.id} skill={skill} onOpen={openSkill} interactive={isInteractive(skill)} />
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
