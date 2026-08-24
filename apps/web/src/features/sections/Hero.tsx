import { Suspense, lazy, useEffect, useState } from "react";

import { api } from "../../lib/api";
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
  const { profile, stats } = useData();
  const [glOk, setGlOk] = useState(true);

  useEffect(() => {
    setGlOk(caps.webgl && !caps.reducedMotion && caps.tier !== "low");
  }, [caps]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: caps.reducedMotion ? "auto" : "smooth" });
  };

  const openResume = () => {
    void api.track("resume_download");
    window.open(profile?.resumeUrl ?? "/files/HARSH-RESUME.pdf", "_blank", "noopener");
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
        <div className="hero-status" data-reveal>
          <span className="dot" />
          SYSTEM ONLINE · {profile?.availability ?? "AVAILABLE"}
        </div>

        <h1 className="hero-name">
          <span className="row"><span className="hero-line">HARSH</span></span>
          <span className="row"><span className="hero-line outline">PANDEY</span></span>
        </h1>

        <div className="hero-role" data-reveal>
          {profile?.headline ?? "Full-Stack Engineer"} — {profile?.subHeadline ?? "BACKEND • AI • SYSTEMS"}
        </div>

        <p className="hero-brief" data-reveal data-reveal-delay="0.1">
          I build systems end to end — train the YOLOv8 model, write the REST API that serves it,
          and ship the whole stack in Docker. Backend-first engineering across Java/Spring Boot,
          Node.js/Express, FastAPI and React, with AI where it earns its place.
        </p>

        <div className="hero-cta" data-reveal data-reveal-delay="0.18">
          <button className="btn btn-solid" onClick={() => scrollTo("projects")}>
            EXPLORE SYSTEMS <span aria-hidden="true">→</span>
          </button>
          <button className="btn" onClick={openResume}>
            RESUME.PDF <span aria-hidden="true">↓</span>
          </button>
          <button className="btn btn-ghost" onClick={() => { unlock("ai"); window.dispatchEvent(new CustomEvent("hp:open-chat")); }}>
            ASK HARSH AI <span aria-hidden="true">◈</span>
          </button>
        </div>

        <div className="hero-meta mono" aria-hidden="true">
          <span>LOC / PUNE, IN — 18.52°N 73.86°E</span>
          <span>MODE / B.TECH IT · FINAL YEAR</span>
          <span>FOCUS / BACKEND · AI · SYSTEMS</span>
        </div>
      </div>

      <div className="hero-scroll">
        <div className="hero-stats">
          <div className="hero-stat"><b>{String(stats?.projects ?? 13).padStart(2, "0")}</b><span>SYSTEMS</span></div>
          <div className="hero-stat"><b>{String(stats?.certificates ?? 42).padStart(2, "0")}</b><span>CREDENTIALS</span></div>
          <div className="hero-stat"><b>{String(stats?.skills ?? 50).padStart(2, "0")}</b><span>CAPABILITIES</span></div>
          <div className="hero-stat"><b>01</b><span>ENGINEER</span></div>
        </div>
        <button className="scroll-cue" onClick={() => scrollTo("identity")} aria-label="Scroll to identity section">
          SCROLL TO DECRYPT
          <span className="line" />
        </button>
      </div>
    </section>
  );
}
