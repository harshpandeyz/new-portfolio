import { useNavigate } from "react-router-dom";
import { useData } from "../../lib/data";
import type { EnvCapabilities } from "../../lib/device";
import { Button } from "../../components/ui/Button";
import { PROFILE } from "../../app/constants";

export interface HeroProps {
  caps: EnvCapabilities;
  onViewResume: () => void;
}

/**
 * First viewport: WHO / WHAT / SPECIALTY / NEXT in one editorial column.
 * Typography only — no photo, no HUD, no WebGL. Progressive enhancement safe:
 * beautiful with reduced motion, on mobile, and on slow networks.
 */
export function Hero({ caps, onViewResume }: HeroProps) {
  const { profile } = useData();
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: caps.reducedMotion ? "auto" : "smooth" });
  };

  const name = profile?.name ?? PROFILE.name;
  const role = profile?.headline ?? PROFILE.headline;
  const positioning = profile?.subHeadline ?? PROFILE.positioning;
  const location = profile?.location ?? PROFILE.location;
  const availability = profile?.availability ?? PROFILE.availability;

  return (
    <section className="hero" id="hero" aria-label="Introduction">
      <div className="hero-inner">
        <p className="hero-kicker">
          <span className="kicker-dot" aria-hidden="true" />
          <span>{location}</span>
          <span aria-hidden="true">·</span>
          <span className="hero-kicker-avail">{availability}</span>
        </p>

        <h1 className="hero-name">{name}</h1>

        <p className="hero-role" data-reveal>
          {role} — <span>{positioning}</span>
        </p>

        <p className="hero-brief" data-reveal data-reveal-delay="0.08">
          I build backend systems and applied-AI products that hold up past the demo —
          reliable APIs and databases, real-time vision pipelines, and interfaces
          that respect the people using them.
        </p>

        <div className="hero-cta" data-reveal data-reveal-delay="0.16">
          <Button variant="primary" onClick={() => scrollTo("work")}>See selected work</Button>
          <Button onClick={onViewResume}>View résumé</Button>
          <button
            type="button"
            className="hero-tertiary"
            onClick={() => navigate("/recruiter")}
          >
            Recruiter briefing — 60 seconds →
          </button>
        </div>

        <dl className="hero-proof" data-reveal data-reveal-delay="0.22">
          <div>
            <dt>Flagship</dt>
            <dd>CCTV-X · YOLOv8 + evidence ledger</dd>
          </div>
          <div>
            <dt>Runtime</dt>
            <dd>OrchestraAI · agent orchestration</dd>
          </div>
          <div>
            <dt>Also</dt>
            <dd>QuantumMind RAG · SkillMatch paths</dd>
          </div>
        </dl>
      </div>

      <div className="hero-scroll">
        <button className="scroll-cue" onClick={() => scrollTo("work")} aria-label="Scroll to selected work">
          Scroll to explore
          <span className="line" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
