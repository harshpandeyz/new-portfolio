import { useNavigate } from "react-router-dom";

import { useData } from "../../lib/data";
import { ACHIEVEMENTS } from "@hp/shared";
import { getAchievements } from "../../lib/achievements";

export function Exit() {
  const { stats } = useData();
  const navigate = useNavigate();
  const unlocked = getAchievements();

  return (
    <section className="sys-section exit" id="exit" aria-label="System complete">
      <div className="container">
        <div className="mono mono-accent" data-reveal>SYSTEM COMPLETE</div>
        <h2 className="section-title" style={{ marginTop: 18 }} data-reveal>
          You have explored the system.
        </h2>

        <div className="exit-counts" data-reveal>
          <div className="exit-count"><b>{String(stats?.projects ?? 0).padStart(2, "0")}</b><span>PROJECT SYSTEMS</span></div>
          <div className="exit-count"><b>{String(stats?.certificates ?? 0).padStart(2, "0")}+</b><span>CREDENTIALS</span></div>
          <div className="exit-count"><b>{String(stats?.skills ?? 0).padStart(2, "0")}</b><span>CAPABILITIES</span></div>
          <div className="exit-count"><b>01</b><span>ENGINEER</span></div>
          <div className="exit-count"><b>∞</b><span>EXPERIMENTS</span></div>
        </div>

        <p className="section-sub" style={{ margin: "0 auto 34px", textAlign: "center" }} data-reveal>
          Ready to build something? The communication interface is standing by.
        </p>

        <div className="exit-cta" data-reveal>
          <a className="btn btn-solid" href="#contact">CONTACT HARSH <span aria-hidden="true">→</span></a>
          <a className="btn" href="/files/HARSH-RESUME.pdf" target="_blank" rel="noopener noreferrer">DOWNLOAD RESUME ↓</a>
          <button className="btn btn-ghost" onClick={() => navigate("/recruiter")}>RECRUITER VIEW ⚡</button>
        </div>

        <div className="exit-achievements" aria-label="Visitor achievements">
          {ACHIEVEMENTS.map((a) => (
            <span className={`ach-chip${unlocked.includes(a.id) ? " unlocked" : ""}`} key={a.id} title={a.description}>
              {unlocked.includes(a.id) ? "◆" : "◇"} {a.title}
            </span>
          ))}
        </div>

        <div className="operator-row">
          <button
            className="operator-btn"
            onClick={() => window.dispatchEvent(new CustomEvent("hp:private-access"))}
            aria-label="Local operator access"
          >
            LOCAL OPERATOR ACCESS
          </button>
        </div>
      </div>
    </section>
  );
}
