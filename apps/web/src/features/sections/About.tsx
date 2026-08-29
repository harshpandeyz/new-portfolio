import { useData } from "../../lib/data";
import { resolveMediaUrl } from "../../lib/api";

export function About() {
  const { profile } = useData();

  return (
    <section className="section" id="about" aria-label="About Harsh">
      <div className="container">
        <div className="section-head" data-reveal>
          <div>
            <span className="eyebrow">About</span>
            <h2 className="section-title">Built with curiosity. Shipped with care.</h2>
            <p className="section-sub">I’m Harsh, a software engineer interested in the point where applications stop being demos and start becoming reliable systems.</p>
          </div>
        </div>

        <div className="identity-grid">
          <div className="identity-photo" data-reveal>
            {profile?.avatarUrl ? <img src={resolveMediaUrl(profile.avatarUrl)} alt={`Portrait of ${profile.name}`} loading="lazy" width={880} height={1100} /> : <div className="photo-placeholder">HP</div>}
            <div className="photo-caption"><span>{profile?.location ?? "Pune, India"}</span><span>Currently building</span></div>
          </div>

          <div className="identity-body">
            <h3 data-reveal>Backend-minded full-stack builder who <em>ships complete systems</em> — not just the demo layer.</h3>
            <p data-reveal>I’m Harsh, a software engineer focused on building reliable software systems, AI-powered applications, and thoughtful full-stack products. I like working end to end — from a clear data model and dependable API to the interface people actually use.</p>
            <p data-reveal>I pick up new ecosystems fast, and I’d rather trace a bug to its root cause than work around it. Right now I’m completing my B.Tech in Information Technology at MIT-ADT University while looking for backend, full-stack, and AI/ML opportunities.</p>

            <div className="identity-facts" data-reveal>
              <div className="fact"><div className="k">Based in</div><div className="v">{profile?.location ?? "Pune, India"}</div></div>
              <div className="fact"><div className="k">Education</div><div className="v">MIT-ADT University · B.Tech Information Technology · 2023–2027 · CGPA 8.38</div></div>
              <div className="fact"><div className="k">Focus</div><div className="v">Backend · AI · Full Stack</div></div>
              <div className="fact"><div className="k">Availability</div><div className="v availability">Open to opportunities</div></div>
            </div>

            <div className="focus-list" data-reveal>
              {["Backend engineering", "Computer vision", "RAG systems", "Docker & CI/CD", "System design"].map((item) => <span className="tag" key={item}>{item}</span>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
