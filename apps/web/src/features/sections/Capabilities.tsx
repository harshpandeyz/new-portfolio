import { useMemo, useState } from "react";
import { useData } from "../../lib/data";
import type { Skill, SkillCategory } from "@hp/shared";

const GROUPS: { key: SkillCategory[]; title: string; intro: string }[] = [
  { key: ["BACKEND", "LANGUAGES"], title: "Backend", intro: "APIs, services, and the systems underneath them." },
  { key: ["AI_ML"], title: "AI / Computer vision", intro: "Applied intelligence with a bias toward useful, grounded outcomes." },
  { key: ["FRONTEND"], title: "Frontend", intro: "Clear interfaces that make the underlying product feel simple." },
  { key: ["CLOUD_DEVOPS", "SECURITY"], title: "Infrastructure", intro: "Containers, delivery, and the details that make software dependable." },
  { key: ["DATABASES"], title: "Databases", intro: "Schemas and storage designed around the product’s real needs." },
  { key: ["MOBILE"], title: "Mobile", intro: "Learning new platforms by building complete, focused experiences." },
];

export function Capabilities() {
  const { skills, error, refresh } = useData();
  const [selected, setSelected] = useState<string | null>(null);
  const grouped = useMemo(() => GROUPS.map((group) => ({ ...group, skills: skills.filter((skill) => group.key.includes(skill.category as SkillCategory) && (group.key.includes("MOBILE") || skill.featured || skill.level === "core")) })).filter((group) => group.skills.length > 0), [skills]);
  const selectedSkill = skills.find((skill) => skill.id === selected);

  return <section className="section capabilities-section" id="capabilities" aria-label="Capabilities">
    <div className="container">
      <div className="section-head section-head-inline" data-reveal><div><span className="eyebrow">Capabilities</span><h2 className="section-title">The tools I reach for.</h2></div><p className="section-sub">A practical toolkit shaped by real projects — and an ongoing habit of learning what the problem needs.</p></div>
      {grouped.length === 0 ? <div className="empty-state">{error ? <>Capabilities couldn’t load. <button className="text-link" onClick={() => void refresh()}>Try again</button></> : "Capabilities are loading…"}</div> : <div className="capability-grid">
        {grouped.map((group, index) => <article className={`capability-card${selectedSkill && group.skills.some((s) => s.id === selectedSkill.id) ? " selected" : ""}`} key={group.title} data-reveal data-reveal-delay={String((index % 3) * 0.06)}>
          <div className="capability-top"><span>0{index + 1}</span><span>↗</span></div><h3>{group.title}</h3><p>{group.intro}</p>
          <div className="capability-skills">{group.skills.map((skill) => <button className={`skill-link${selected === skill.id ? " active" : ""}`} key={skill.id} onClick={() => setSelected(selected === skill.id ? null : skill.id)} aria-expanded={selected === skill.id}>{skill.name}<span>+</span></button>)}</div>
          {selectedSkill && group.skills.some((s) => s.id === selectedSkill.id) && <div className="skill-expanded"><strong>{selectedSkill.name}</strong>{selectedSkill.description && <p>{selectedSkill.description}</p>}{selectedSkill.usedIn.length > 0 && <span>Used in {selectedSkill.usedIn.slice(0, 2).join(" and ")}</span>}</div>}
        </article>)}
      </div>}
    </div>
  </section>;
}
