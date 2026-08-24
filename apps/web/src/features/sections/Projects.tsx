import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useData } from "../../lib/data";
import { unlock } from "../../lib/achievements";
import { api } from "../../lib/api";
import type { Project } from "@hp/shared";

const TIER_ORDER: Project["tier"][] = ["featured", "secondary", "experiment", "academic", "legacy", "internship"];
const TIER_LABELS: Record<Project["tier"], string> = {
  featured: "FLAGSHIP",
  secondary: "SECONDARY",
  experiment: "EXPERIMENT",
  academic: "ACADEMIC",
  legacy: "ARCHIVED",
  internship: "INTERNSHIP",
};

export function Projects() {
  const { projects } = useData();
  const navigate = useNavigate();

  const grouped = useMemo(() => {
    return TIER_ORDER.map((tier) => ({ tier, items: projects.filter((p) => p.tier === tier) })).filter((g) => g.items.length > 0);
  }, [projects]);

  const open = (slug: string) => {
    unlock("explorer");
    void api.track("project_view", slug);
    navigate(`/projects/${slug}`);
  };

  return (
    <section className="sys-section" id="projects" aria-label="Project constellation">
      <div className="container">
        <div className="section-head" data-reveal>
          <span className="section-index">03 / SYSTEMS</span>
          <div>
            <h2 className="section-title">Project Constellation</h2>
            <p className="section-sub">
              Curated engineering systems — flagship builds first, experiments and archived work kept
              for the record. Every claim traces to a public repository.
            </p>
          </div>
        </div>

        <div className="proj-legend" data-reveal>
          {grouped.map(({ tier }) => (
            <span className="lg" key={tier} style={{ ["--tier-color" as string]: `var(--tier-${tier})` }}>
              <i />{TIER_LABELS[tier]} · {projects.filter((p) => p.tier === tier).length}
            </span>
          ))}
        </div>

        {grouped.map(({ tier, items }) => (
          <div key={tier} style={{ marginBottom: 34 }}>
            {tier !== "featured" && (
              <div className="mono mono-dim" style={{ marginBottom: 12 }} data-reveal>
                ── {TIER_LABELS[tier]} CLASS ──
              </div>
            )}
            <div className="proj-grid">
              {items.map((p, i) => (
                <button
                  key={p.id}
                  className={`proj-node tier-${p.tier}${i === 0 && tier === "featured" ? " wide" : ""}`}
                  onClick={() => open(p.slug)}
                  data-reveal
                  data-reveal-delay={String((i % 3) * 0.08)}
                  aria-label={`Open case study: ${p.title}`}
                >
                  <div className="pn-top">
                    <span className="pn-id">{String(p.order).padStart(2, "0")} · {p.category}</span>
                    <span className="pn-tier">{TIER_LABELS[p.tier]}</span>
                  </div>
                  <h3>{p.title}</h3>
                  <p>{p.shortDescription}</p>
                  <div className="pn-stack">
                    {p.stack.slice(0, 5).map((t) => <span className="tag" key={t}>{t}</span>)}
                    {p.stack.length > 5 && <span className="tag">+{p.stack.length - 5}</span>}
                  </div>
                  <div className="pn-foot">
                    <span className={`status-dot status-${p.status}`} aria-hidden="true" />
                    <span>{p.status.toUpperCase()} · {p.year}</span>
                    <span className="open">CASE STUDY →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
