import { useMemo } from "react";

import { useData } from "../../lib/data";
import type { TimelineType } from "@hp/shared";

const TYPE_LABELS: Record<TimelineType, string> = {
  education: "EDUCATION",
  project: "PROJECT",
  certification: "CERTIFICATION",
  experience: "EXPERIENCE",
  competition: "COMPETITION",
  milestone: "MILESTONE",
};

export function Timeline() {
  const { timeline } = useData();
  const items = useMemo(() => [...timeline].sort((a, b) => a.order - b.order), [timeline]);

  return (
    <section className="sys-section" id="timeline" aria-label="Mission log">
      <div className="container">
        <div className="section-head" data-reveal>
          <span className="section-index">04 / MISSION LOG</span>
          <div>
            <h2 className="section-title">Reconstruction Sequence</h2>
            <p className="section-sub">
              Education, milestones, competitions and experience — every entry verified against the
              resume and certificate archive.
            </p>
          </div>
        </div>

        <div className="timeline">
          {items.map((t, i) => (
            <div className={`tl-item t-${t.type}`} key={t.id} data-reveal data-reveal-delay={String((i % 4) * 0.05)}>
              <span className="tl-type">{TYPE_LABELS[t.type as TimelineType] ?? t.type}</span>
              <div className="tl-date">
                {t.date}{t.endDate ? ` — ${t.endDate}` : ""}
              </div>
              <div className="tl-title">{t.title}</div>
              {t.organization && <div className="tl-org">{t.organization}</div>}
              {t.description && <p className="tl-desc">{t.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
