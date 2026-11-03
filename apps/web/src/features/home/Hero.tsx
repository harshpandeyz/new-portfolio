import { Link } from "react-router-dom";
import { useData } from "../../lib/data";
import { scrollBehavior } from "../../lib/motion";
import { Button } from "../../components/ui/Button";
import { IconArrowRight, IconDownload } from "../../components/ui/icons";
import { PROFILE } from "../../app/constants";
import { HeroAtlas } from "./HeroAtlas";

export interface HeroProps {
  onViewResume: () => void;
}

const PROOF = [
  { index: "01", label: "Flagship", name: "OrchestraAI", detail: "Adaptive agent runtime", slug: "orchestraai" },
  { index: "02", label: "Benchmark", name: "SENSELINE", detail: "Sensor evaluation", slug: "senseline" },
  { index: "03", label: "Applied AI", name: "CCTV-X", detail: "Vision + evidence", slug: "intelligent-surveillance-system" },
] as const;

function PinGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

/**
 * First viewport: status → name → role → brief → next steps, balanced by the
 * system atlas (an abstract, live-looking rendering of a layered backend).
 * Typography and a single restrained visualization — no photos, no canvas,
 * no WebGL. Progressive enhancement safe: complete and calm with reduced
 * motion, on mobile, and on slow networks.
 */
export function Hero({ onViewResume }: HeroProps) {
  const { profile } = useData();
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: scrollBehavior() });
  };

  const name = profile?.name ?? PROFILE.name;
  const role = profile?.headline ?? PROFILE.headline;
  const positioning = profile?.subHeadline ?? PROFILE.positioning;
  const location = profile?.location ?? PROFILE.location;
  const availability = profile?.availability ?? PROFILE.availability;

  return (
    <section className="hero" id="hero" aria-label="Introduction">
      <div className="hero-inner">
        <div className="hero-copy">
          <div className="hero-status">
            <span className="hero-chip hero-chip--loc">
              <PinGlyph />
              <span>{location}</span>
            </span>
            <span className="hero-chip hero-chip--avail">
              <span className="hero-chip-beacon" aria-hidden="true" />
              <span>{availability}</span>
            </span>
          </div>

          <h1 className="hero-name">{name}</h1>

          <p className="hero-role">
            <span className="hero-role-title">{role}</span>
            <span className="hero-role-focus">
              <span className="hero-role-slash" aria-hidden="true">/</span>
              {positioning}
            </span>
          </p>

          <p className="hero-brief">
            I build backend systems and applied-AI products that hold up past the demo —
            reliable APIs and databases, real-time vision pipelines, and interfaces
            that respect the people using them.
          </p>

          <div className="hero-cta">
            <Button variant="primary" className="hero-cta-primary" onClick={() => scrollTo("work")}>
              See selected work
              <IconArrowRight className="hero-cta-arrow" aria-hidden="true" />
            </Button>
            <Button className="hero-cta-secondary" onClick={onViewResume}>
              <IconDownload className="hero-cta-icon" aria-hidden="true" />
              View résumé
            </Button>
          </div>

          <Link to="/recruiter" className="hero-profile-cta">
            <span className="hero-profile-cta-copy">
              <strong>Explore my engineering profile</strong>
              <small>60-second briefing · Selected work · Technical capabilities</small>
            </span>
            <span className="hero-profile-cta-arrow" aria-hidden="true"><IconArrowRight /></span>
          </Link>
        </div>

        <div className="hero-figure">
          <HeroAtlas />
        </div>
      </div>

      <div className="hero-proof-row container">
        <nav className="hero-proof" aria-label="Flagship project navigator">
          {PROOF.map((item) => (
            <Link className="proof-item" key={item.index} to={`/projects/${item.slug}`}>
              <span className="proof-meta">
                <span className="proof-index">{item.index}</span>
                <span className="proof-label">{item.label}</span>
              </span>
              <span className="proof-main">
                <span className="proof-name">{item.name}</span>
                <span className="proof-detail">{item.detail}</span>
              </span>
              <span className="proof-arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
