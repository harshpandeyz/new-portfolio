import { useMemo } from "react";

import { useData } from "../../lib/data";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState";

/**
 * Journey is a story of meaningful milestones — NOT a certificate timeline.
 * Individual external certifications live in Credentials. This section keeps
 * the education story visible and the certifications out of the narrative.
 */
export function Journey() {
  const { timeline, education, error, refresh } = useData();

  // Drop certificate entries and pre-B.Tech education from the narrative.
  const milestones = useMemo(
    () =>
      [...timeline]
        .filter((item) => item.type !== "certification" && !(item.type === "education" && Number(item.date) < 2023))
        .sort((a, b) => a.order - b.order),
    [timeline],
  );

  const btech = education.find((e) => e.startYear === "2023") ?? education[0];

  return (
    <section className="section journey-section" id="journey" aria-label="Journey">
      <div className="container">
        <SectionHeader eyebrow="Journey" title="Building, year by year." sub="The milestones that shaped how I build — from the first project to the platform you're reading this on." />

        <div className="journey-layout">
          <div className="timeline">
            {milestones.length > 0 ? (
              milestones.map((item, index) => (
                <article className="tl-item" key={item.id} data-reveal data-reveal-delay={String((index % 3) * 0.06)}>
                  <div className="tl-year">{item.date}</div>
                  <div>
                    <h3>{item.title}</h3>
                    {item.organization && <div className="tl-org">{item.organization}</div>}
                    {item.description && <p>{item.description}</p>}
                  </div>
                </article>
              ))
            ) : (
              <EmptyState>{error ? <ErrorState message="Journey couldn't load." onRetry={() => void refresh()} /> : "Journey is loading…"}</EmptyState>
            )}
          </div>

          {btech && (
            <aside className="education-note" data-reveal>
              <span className="eyebrow">Education</span>
              <div className="education-item">
                <h3>{btech.degree}</h3>
                <p>{btech.institution}</p>
                <small>
                  {btech.startYear} — {btech.endYear ?? "Present"}
                  {btech.grade ? ` · ${btech.grade}` : ""}
                </small>
                {btech.description && <p className="education-item-desc">{btech.description}</p>}
              </div>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}