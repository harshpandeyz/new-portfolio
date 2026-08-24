import { useEffect, useRef } from "react";

import { useData } from "../../lib/data";
import { splitReveal } from "../../lib/motion";
import type { EnvCapabilities } from "../../lib/device";

export function Identity({ caps }: { caps: EnvCapabilities }) {
  const { profile } = useData();
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (titleRef.current) splitReveal(titleRef.current, caps);
  }, [caps]);

  const social = (label: string) => profile?.socials.find((s) => s.label.toLowerCase() === label)?.url;

  return (
    <section className="sys-section" id="identity" aria-label="Identity">
      <div className="container">
        <div className="section-head" data-reveal>
          <span className="section-index">01 / IDENTITY</span>
          <div>
            <h2 className="section-title" ref={titleRef}>The engineer behind the system</h2>
            <p className="section-sub">
              One person, full stack. The profile is verified against the live resume on record.
            </p>
          </div>
        </div>

        <div className="identity-grid">
          <div className="identity-photo brackets" data-reveal>
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt={`Portrait of ${profile.name}`} loading="lazy" width={880} height={1100} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--faint)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                NO IMAGE ON FILE
              </div>
            )}
            <div className="photo-frame" aria-hidden="true" />
            <span className="photo-tag">SUBJECT: {profile?.name?.toUpperCase() ?? "HARSH PANDEY"} · VERIFIED</span>
          </div>

          <div className="identity-body">
            <h3 data-reveal>
              Backend-minded full-stack builder who <em>ships complete systems</em> — not just the demo layer.
            </h3>
            <p data-reveal>
              {profile?.bio ??
                "Final-year B.Tech Information Technology student at MIT-ADT University, Pune, building systems end to end — training a YOLOv8 model, writing the REST API that serves its output, and getting the whole stack running in Docker."}
            </p>
            <p data-reveal>
              I pick up new ecosystems fast — taught myself Swift/UIKit well enough to ship a small iOS app —
              and I'd rather trace a bug to its root cause than work around it. Currently looking for
              full-stack, backend, or AI/ML engineering roles.
            </p>

            <div className="identity-facts" data-reveal>
              <div className="fact"><div className="k">Location</div><div className="v">{profile?.location ?? "Pune, India"}</div></div>
              <div className="fact"><div className="k">Degree</div><div className="v">B.Tech IT · 2023—2027</div></div>
              <div className="fact"><div className="k">Focus</div><div className="v">Backend · AI · Systems</div></div>
              <div className="fact"><div className="k">Status</div><div className="v" style={{ color: "var(--ok)" }}>{profile?.availability ?? "Open to roles"}</div></div>
            </div>

            <div className="focus-list" data-reveal>
              {["Backend engineering", "Computer vision", "RAG systems", "Docker & CI/CD", "Blockchain evidence", "System design"].map((f) => (
                <span className="tag" key={f}>{f}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
