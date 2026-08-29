import { Suspense, lazy, useEffect, useState } from "react";

import { api, resolveMediaUrl } from "../../lib/api";
import { useData } from "../../lib/data";
import { type EnvCapabilities } from "../../lib/device";
import { unlock } from "../../lib/achievements";
import type { CoreMode } from "../../components/three/CoreScene";

const CoreScene = lazy(() => import("../../components/three/CoreScene"));

interface HeroProps {
  caps: EnvCapabilities;
  coreMode: CoreMode;
}

export function Hero({ caps, coreMode }: HeroProps) {
  const { profile } = useData();
  const [glOk, setGlOk] = useState(true);

  useEffect(() => {
    setGlOk(caps.webgl && !caps.reducedMotion && caps.tier !== "low");
  }, [caps]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: caps.reducedMotion ? "auto" : "smooth" });
  };

  const openResume = () => {
    void api.track("resume_download");
    window.open(resolveMediaUrl(profile?.resumeUrl ?? "/files/HARSH-RESUME.pdf"), "_blank", "noopener");
  };

  return (
    <section className="hero" id="hero" aria-label="Introduction">
      <div className="hero-core" aria-hidden="true">
        {glOk ? (
          <Suspense fallback={<div className="hero-core-fallback" />}>
            <div style={{ width: "min(90vw, 760px)", height: "min(90vw, 760px)" }}>
              <CoreScene mode={coreMode} tier={caps.tier === "medium" ? "medium" : "high"} />
            </div>
          </Suspense>
        ) : (
          <div className="hero-core-fallback" />
        )}
      </div>

      <div className="hero-content">
        <div className="hero-kicker" data-reveal><span className="kicker-dot" />Software Engineer</div>

        <h1 className="hero-name">
          <span className="row"><span className="hero-line">Harsh Pandey</span></span>
        </h1>

        <p className="hero-tagline" data-reveal>building systems that work.</p>

        <div className="hero-role" data-reveal>
          Backend · AI · Full Stack
        </div>

        <p className="hero-brief" data-reveal data-reveal-delay="0.1">
          I build thoughtful, reliable software from the first API to the final interaction — with a focus on backend systems, applied AI, and products that are built to last.
        </p>

        <div className="hero-cta" data-reveal data-reveal-delay="0.18">
          <button className="btn btn-solid" onClick={() => scrollTo("projects")}>
            View my work <span aria-hidden="true">↗</span>
          </button>
          <button className="btn" onClick={openResume}>
            Download résumé <span aria-hidden="true">↓</span>
          </button>
          <button className="btn btn-ghost" onClick={() => { unlock("ai"); window.dispatchEvent(new CustomEvent("hp:open-chat")); }}>
            Ask Harsh <span aria-hidden="true">✦</span>
          </button>
        </div>

        <div className="hero-meta" data-reveal data-reveal-delay="0.24">
          <span>{profile?.location ?? "Pune, India"}</span><i />
          <span>Open to opportunities</span>
        </div>
      </div>

      <div className="hero-scroll">
        <button className="scroll-cue" onClick={() => scrollTo("about")} aria-label="Scroll to about section">
          Scroll to explore
          <span className="line" />
        </button>
      </div>
    </section>
  );
}
