import { useEffect } from "react";
import { Link } from "react-router-dom";

import { api } from "../../lib/api";
import { useData } from "../../lib/data";

/** Compressed, printable, no-nonsense view for recruiters. */
export function Recruiter() {
  const { profile, projects, skills, education, certTotal } = useData();

  useEffect(() => {
    document.title = "Harsh Pandey — Recruiter View";
    void api.track("recruiter_view");
    return () => {
      document.title = "Harsh Pandey — HP//OS";
    };
  }, []);

  const top = projects.filter((p) => p.tier === "featured").slice(0, 4);
  const coreSkills = skills.filter((s) => s.level === "core").map((s) => s.name);
  const working = skills.filter((s) => s.level === "working").map((s) => s.name);

  return (
    <div style={{ minHeight: "100svh", padding: "48px 0 80px" }}>
      <div className="container" style={{ maxWidth: 980 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <span className="brand">HP<b>//</b>OS <span className="mono mono-dim" style={{ marginLeft: 8 }}>RECRUITER MODE</span></span>
          <div style={{ display: "flex", gap: 10 }}>
            <a className="btn btn-sm" href="/files/HARSH-RESUME.pdf" target="_blank" rel="noopener noreferrer">RESUME PDF ↓</a>
            <Link className="btn btn-sm btn-ghost" to="/">FULL EXPERIENCE →</Link>
          </div>
        </div>

        <h1 style={{ fontSize: "clamp(38px, 6vw, 64px)", marginTop: 44, letterSpacing: "-0.03em" }}>
          {profile?.name ?? "Harsh Pandey"}
        </h1>
        <div className="mono mono-accent" style={{ marginTop: 10, fontSize: 12 }}>
          {profile?.headline ?? "Full-Stack Engineer"} — {profile?.subHeadline ?? "BACKEND • AI • SYSTEMS"} · {profile?.location ?? "Pune, India"}
        </div>
        <p style={{ marginTop: 20, maxWidth: 720, color: "var(--muted)", fontSize: 15.5, lineHeight: 1.8 }}>
          Final-year B.Tech IT (MIT-ADT University, Pune, 2023–2027 · CGPA 8.38). Builds systems end to
          end — YOLOv8 models, the REST APIs that serve them, and the Docker/CI-CD pipelines that ship
          them. Open to full-stack, backend and AI/ML engineering roles.
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 26, flexWrap: "wrap" }}>
          <a className="btn btn-solid btn-sm" href={`mailto:${profile?.email ?? "harshap17058@gmail.com"}`}>EMAIL HARSH</a>
          <a className="btn btn-sm" href="https://github.com/harshpandeyz" target="_blank" rel="noopener noreferrer">GITHUB ↗</a>
          <a className="btn btn-sm" href="https://www.linkedin.com/in/harshpandeyz/" target="_blank" rel="noopener noreferrer">LINKEDIN ↗</a>
        </div>

        <section style={{ marginTop: 52 }}>
          <h2 className="mono mono-dim" style={{ marginBottom: 16 }}>TOP PROJECTS — VERIFIED ON GITHUB</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {top.map((p) => (
              <Link key={p.id} to={`/projects/${p.slug}`} className="fact" style={{ display: "block", borderRadius: 0, transition: "background .2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 15.5 }}>{p.title}</strong>
                  <span className="mono mono-dim">{p.year}</span>
                </div>
                <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6, lineHeight: 1.6 }}>{p.shortDescription}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  {p.stack.slice(0, 7).map((t) => <span className="tag" key={t}>{t}</span>)}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 46 }}>
          <h2 className="mono mono-dim" style={{ marginBottom: 16 }}>SKILLS — HONEST LEVELS</h2>
          <div className="identity-facts" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="fact"><div className="k">CORE (DAILY DRIVERS)</div><div className="v" style={{ lineHeight: 1.9 }}>{coreSkills.join(" · ")}</div></div>
            <div className="fact"><div className="k">WORKING KNOWLEDGE</div><div className="v" style={{ lineHeight: 1.9 }}>{working.join(" · ")}</div></div>
          </div>
        </section>

        <section style={{ marginTop: 46 }}>
          <h2 className="mono mono-dim" style={{ marginBottom: 16 }}>EDUCATION</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {education.map((e) => (
              <div className="fact" key={e.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 14.5 }}>{e.degree}{e.field ? ` (${e.field})` : ""}</strong>
                  <span className="mono mono-dim">{e.startYear}–{e.endYear ?? "PRESENT"}{e.grade ? ` · ${e.grade}` : ""}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{e.institution}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 46 }}>
          <h2 className="mono mono-dim" style={{ marginBottom: 16 }}>CREDENTIALS</h2>
          <p style={{ color: "var(--muted)", fontSize: 14.5, lineHeight: 1.8 }}>
            {certTotal} verified certificates including MongoDB Java Developer Path (MongoDB University),
            Backend Development &amp; API Creation (Coursera/IBM/Packt), Software Engineering &amp; Agile and
            Cloud Technologies (Infosys Springboard), Networking Basics (Cisco Networking Academy), plus
            AMCAT certification (Computer Science 99/100, Automata Fix 100/100) and the IdeaSpark 2K24
            "Best Idea" award. Full archive with documents lives in the main experience.
          </p>
        </section>

        <div style={{ marginTop: 56, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="btn btn-solid" href={`mailto:${profile?.email ?? "harshap17058@gmail.com"}`}>START A CONVERSATION →</a>
          <a className="btn" href="/files/HARSH-RESUME.pdf" target="_blank" rel="noopener noreferrer">DOWNLOAD RESUME ↓</a>
        </div>
      </div>
    </div>
  );
}
