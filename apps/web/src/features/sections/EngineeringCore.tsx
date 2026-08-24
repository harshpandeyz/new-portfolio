import { useMemo, useState } from "react";

import { useData } from "../../lib/data";
import type { Skill, SkillCategory } from "@hp/shared";

const GROUP_ORDER: SkillCategory[] = [
  "LANGUAGES", "BACKEND", "FRONTEND", "DATABASES", "AI_ML",
  "CLOUD_DEVOPS", "SECURITY", "MOBILE", "BLOCKCHAIN", "EXPERIMENTAL",
];

const GROUP_LABELS: Record<SkillCategory, string> = {
  LANGUAGES: "LANGUAGES",
  FRONTEND: "FRONTEND",
  BACKEND: "BACKEND",
  DATABASES: "DATABASES",
  AI_ML: "AI / MACHINE LEARNING",
  CLOUD_DEVOPS: "CLOUD / DEVOPS",
  SECURITY: "SECURITY",
  MOBILE: "MOBILE",
  BLOCKCHAIN: "BLOCKCHAIN",
  EXPERIMENTAL: "EXPERIMENTAL",
};

const LEVEL_LABELS: Record<string, string> = {
  core: "CORE — DAILY DRIVER",
  working: "WORKING KNOWLEDGE",
  exploring: "ACTIVELY EXPLORING",
  experimental: "EXPERIMENTING",
};

export function EngineeringCore() {
  const { skills } = useData();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["LANGUAGES", "BACKEND"]));
  const [selected, setSelected] = useState<Skill | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<SkillCategory, Skill[]>();
    for (const s of skills) {
      const cat = s.category as SkillCategory;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({ category: g, skills: map.get(g)! }));
  }, [skills]);

  const toggleGroup = (g: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });

  const current = selected ?? skills.find((s) => s.name === "FastAPI") ?? skills[0] ?? null;

  return (
    <section className="sys-section" id="core" aria-label="Engineering core">
      <div className="container">
        <div className="section-head" data-reveal>
          <span className="section-index">02 / CAPABILITIES</span>
          <div>
            <h2 className="section-title">Engineering Core</h2>
            <p className="section-sub">
              Capabilities as systems, not badges. Every level is declared honestly — no percentage bars,
              no inflated claims. Select any module for its service record.
            </p>
          </div>
        </div>

        <div className="core-layout">
          <div className="core-groups" data-reveal>
            {grouped.map(({ category, skills: groupSkills }) => {
              const open = openGroups.has(category);
              return (
                <div className={`core-group${open ? " open" : ""}`} key={category}>
                  <button className="core-group-head" onClick={() => toggleGroup(category)} aria-expanded={open}>
                    <span className="g-name">{GROUP_LABELS[category]}</span>
                    <span className="g-count">{String(groupSkills.length).padStart(2, "0")} MODULES</span>
                    <span className="g-arrow" aria-hidden="true">→</span>
                  </button>
                  <div className="core-group-body">
                    {groupSkills.map((s) => (
                      <button
                        key={s.id}
                        className={`skill-chip${current?.id === s.id ? " active" : ""}`}
                        data-level={s.level}
                        onClick={() => setSelected(s)}
                      >
                        <span className="level-dot" aria-hidden="true" />
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {current && (
            <aside className="skill-detail brackets" data-level={current.level} data-reveal aria-live="polite">
              <span className="sd-cat">{GROUP_LABELS[current.category as SkillCategory]}</span>
              <h3>{current.name}</h3>
              <span className="sd-level"><span className="level-dot" />{LEVEL_LABELS[current.level] ?? current.level}</span>
              {current.description && <p>{current.description}</p>}

              {current.usedIn.length > 0 && (
                <div className="sd-sec">
                  <h4>DEPLOYED IN</h4>
                  <ul>
                    {current.usedIn.map((u) => <li key={u}>{u}</li>)}
                  </ul>
                </div>
              )}
              {current.relatedConcepts.length > 0 && (
                <div className="sd-sec">
                  <h4>RELATED CONCEPTS</h4>
                  <div className="focus-list" style={{ marginTop: 4 }}>
                    {current.relatedConcepts.map((c) => <span className="tag" key={c}>{c}</span>)}
                  </div>
                </div>
              )}
              {current.usedIn.length === 0 && !current.description && (
                <p className="sd-empty">MODULE RECORD PENDING — DETAILS ON REQUEST</p>
              )}
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
