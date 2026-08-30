import { Suspense, lazy, useEffect, useState } from "react";

import { useData } from "../../lib/data";
import type { EnvCapabilities } from "../../lib/device";
import type { CoreMode } from "../../components/three/CoreScene";
import { Button } from "../../components/ui/Button";
import { PROFILE } from "../../app/constants";

const CoreScene = lazy(() => import("../../components/three/CoreScene"));

export interface HeroProps {
  caps: EnvCapabilities;
  coreMode: CoreMode;
  onViewResume: () => void;
}

/** First viewport: who / what / where / what to click — understood in seconds. */
export function Hero({ caps, coreMode, onViewResume }: HeroProps) {
  const { profile } = useData();
  const [glOk, setGlOk] = useState(true);

  useEffect(() => {
    setGlOk(caps.webgl && !caps.reducedMotion && caps.tier !== "low");
  }, [caps]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: caps.reducedMotion ? "auto" : "smooth" });
  };

  return (
    <section className="hero" id="hero" aria-label="Introduction">
      <div className="hero-core" aria-hidden="true">
        {glOk ? (
          <Suspense fallback={<div className="hero-core-fallback" />}>
            <div style={{ width: "min(90vw, 760px)", height: "min(90vw, 760px)" }}>
              <CoreScene mode={coreMode} tier={caps.tier === "medium" ? "medium" : "high"} reducedMotion={caps.reducedMotion} />
            </div>
          </Suspense>
        ) : (
          <div className="hero-core-fallback" />
        )}
      </div>

      <div className="hero-content">
        <div className="hero-kicker">
          <span className="kicker-dot" aria-hidden="true" />
          <span>Software Engineer</span>
        </div>

        <h1 className="hero-name">
          <span className="row"><span className="hero-line">Harsh Pandey</span></span>
        </h1>

        <p className="hero-tagline" data-reveal>
          {profile?.subHeadline ?? PROFILE.positioning}
        </p>

        <p className="hero-brief" data-reveal data-reveal-delay="0.08">
          I build reliable software systems end to end — from APIs and databases to intelligent products and polished interfaces.
        </p>

        <div className="hero-cta" data-reveal data-reveal-delay="0.16">
          <Button variant="primary" onClick={() => scrollTo("work")}>View selected work</Button>
          <Button onClick={onViewResume}>View résumé</Button>
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