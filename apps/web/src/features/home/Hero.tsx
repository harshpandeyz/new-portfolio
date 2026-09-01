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
 * First viewport: typography only. Name, role, a short promise, and one clear
 * action. No photo (About owns the only portrait), no HUD, no decorative UI —
 * the strongest thing on first load is the writing.
 */
export function Hero({ caps, onViewResume }: HeroProps) {
  const { profile } = useData();
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: caps.reducedMotion ? "auto" : "smooth" });
  };

  return (
    <section className="hero" id="hero" aria-label="Introduction">
      <div className="hero-inner">
        <p className="hero-kicker">
          <span className="kicker-dot" aria-hidden="true" />
          Software Engineer · Pune
        </p>

        <h1 className="hero-name">{profile?.name ?? PROFILE.name}</h1>

        <p className="hero-tagline" data-reveal>
          {profile?.headline ?? PROFILE.headline}
        </p>

        <p className="hero-brief" data-reveal data-reveal-delay="0.08">
          I build software systems that hold up past the demo — reliable APIs and databases,
          applied AI, and interfaces that respect the people using them.
        </p>

        <div className="hero-cta" data-reveal data-reveal-delay="0.16">
          <Button variant="primary" onClick={() => scrollTo("work")}>See my work</Button>
          <Button onClick={onViewResume}>View résumé</Button>
          <Button variant="secondary" onClick={() => navigate("/recruiter")}>Recruiter view — fast résumé</Button>
        </div>

        <div className="hero-meta" data-reveal data-reveal-delay="0.22">
          <span>{profile?.location ?? PROFILE.location}</span>
          <i aria-hidden="true" />
          <span>{profile?.availability ?? PROFILE.availability}</span>
        </div>
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