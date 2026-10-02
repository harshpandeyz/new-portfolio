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

  const primary = education.find((item) => item.primary);
  const university = primary ? [primary] : [];
  const btech = primary;

  return (
    <section className="section edu-section" id="journey" aria-label="Education">
      <div className="container">
        <SectionHeader eyebrow="Education" title="The formal kind of learning." sub="One university. One specialization. Four years of building." />

        {university.length > 0 ? (
          <div className="edu-grid">
            <div className="edu-rows">
              {university.map((item, index) => (
                <article className="edu-row" key={item.id}>
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
            {btech && (
              <>
                <p className="edu-school">
                  {btech.degree}, {btech.field ?? "Information Technology"} at <strong>{btech.institution}</strong>.
                </p>
                <p className="edu-final">
                  {btech.description ?? [btech.grade, btech.endYear ? `expected ${btech.endYear}` : null].filter(Boolean).join(" · ")}
                </p>
              </>
            )}
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
