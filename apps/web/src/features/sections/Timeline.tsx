import { useMemo } from "react";
import { useData } from "../../lib/data";

export function Timeline() {
  const { timeline, education, error, refresh } = useData();
  const items = useMemo(() => [...timeline].filter((item) => !(item.type === "education" && Number(item.date) < 2023)).sort((a, b) => a.order - b.order), [timeline]);
  const currentEducation = education.filter((item) => Number(item.startYear) >= 2023);

  return <section className="section journey-section" id="timeline" aria-label="Journey">
    <div className="container">
      <div className="section-head" data-reveal><span className="eyebrow">Journey</span><h2 className="section-title">Always learning, always building.</h2><p className="section-sub">The work and education behind the systems.</p></div>
      <div className="journey-layout">
        <div className="timeline">{items.length > 0 ? items.map((item, index) => <article className="tl-item" key={item.id} data-reveal data-reveal-delay={String((index % 3) * 0.06)}><div className="tl-year">{item.date}</div><div><h3>{item.title}</h3>{item.organization && <div className="tl-org">{item.organization}</div>}{item.description && <p>{item.description}</p>}</div></article>) : <div className="empty-state">{error ? <>Journey couldn’t load. <button className="text-link" onClick={() => void refresh()}>Try again</button></> : "Journey is loading…"}</div>}</div>
        {currentEducation.length > 0 && <aside className="education-note" data-reveal><span className="eyebrow">Education</span>{currentEducation.map((item) => <div className="education-item" key={item.id}><h3>{item.degree}</h3><p>{item.institution}</p><small>{item.startYear} — {item.endYear ?? "Present"}{item.grade ? ` · ${item.grade}` : ""}</small></div>)}</aside>}
      </div>
    </div>
  </section>;
}
