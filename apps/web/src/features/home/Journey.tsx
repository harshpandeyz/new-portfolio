import { useData } from "../../lib/data";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState";

/**
 * Education is deliberately small: a compact university section, text only —
 * one line about the program and the degree detail. Class 10/12 is excluded;
 * only the university record is shown, and no photo appears here (About owns
 * the single portrait).
 */
export function Journey() {
  const { education, error, refresh } = useData();

  const university = education.filter((e) => Number(e.startYear) >= 2022);
  const btech = university.find((e) => e.field) ?? university[0];

  return (
    <section className="section edu-section" id="journey" aria-label="Education">
      <div className="container">
        <SectionHeader eyebrow="Education" title="The formal kind of learning." sub="One university. One specialization. Four years of building." />

        {university.length > 0 ? (
          <div className="edu-grid">
            <div className="edu-rows">
              {university.map((item, index) => (
                <article className="edu-row" key={item.id} data-reveal data-reveal-delay={String(index * 0.06)}>
                  <div className="edu-main">
                    <h3>{item.degree}</h3>
                    <p className="edu-inst">{item.institution}</p>
                    {item.description && <p className="edu-desc">{item.description}</p>}
                  </div>
                  <div className="edu-meta">
                    <span className="edu-years">
                      {item.startYear}–{item.endYear ?? "Present"}
                    </span>
                    {item.grade && <span className="edu-grade">{item.grade}</span>}
                  </div>
                </article>
              ))}
            </div>
            <p className="edu-school">
              Final-year B.Tech, Information Technology at <strong>MIT-ADT University, Pune</strong>.
            </p>
            <p className="edu-final">
              Software &amp; Mobile Application Development specialization · CGPA 8.38 · graduating 2027.
            </p>
          </div>
        ) : error ? (
          <ErrorState message="Education couldn't load." onRetry={() => void refresh()} />
        ) : (
          <EmptyState>Education is loading…</EmptyState>
        )}
      </div>
    </section>
  );
}