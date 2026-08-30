import { useData } from "../../lib/data";
import { resolveMediaUrl } from "../../lib/api";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { PROFILE } from "../../app/constants";

const FOCUS = ["Backend systems", "Applied AI", "Full-stack applications", "System design", "Deployment"];

export function About() {
  const { profile, education } = useData();
  const btech = education.find((e) => e.startYear === "2023" && e.field?.includes("Software")) ?? education[0];

  return (
    <section className="section" id="about" aria-label="About Harsh">
      <div className="container">
        <SectionHeader eyebrow="About" title="Backend-minded engineer." sub="I enjoy taking a system from an idea to a dependable implementation." />

        <div className="identity-grid">
          <div className="identity-photo" data-reveal>
            {profile?.avatarUrl ? <img src={resolveMediaUrl(profile.avatarUrl)} alt={`Portrait of ${profile.name}`} loading="lazy" width={880} height={1100} /> : <div className="photo-placeholder">HP</div>}
            <div className="photo-caption"><span>{profile?.location ?? PROFILE.location}</span><span>Currently building</span></div>
          </div>

          <div className="identity-body">
            <h3 data-reveal>I take systems from a clear data model to a dependable, shippable implementation — and I'd rather trace a bug to its root cause than work around it.</h3>
            <p data-reveal>
              My work spans the stack with real depth in the backend: designing REST APIs, wiring up relational and document databases, securing authentication, and containerizing the result so it runs anywhere. Recent projects cover applied computer vision, retrieval-augmented AI, and Spring Boot platforms.
            </p>
            <p data-reveal>
              I'm completing my B.Tech in Information Technology at MIT-ADT University, Pune, building systems that hold up beyond the demo — and I'm open to backend, full-stack and AI/ML opportunities.
            </p>

            <div className="identity-facts" data-reveal>
              <div className="fact"><div className="k">Based in</div><div className="v">{profile?.location ?? PROFILE.location}</div></div>
              <div className="fact"><div className="k">Focus</div><div className="v">Backend · AI · Full Stack</div></div>
              <div className="fact"><div className="k">Availability</div><div className="v availability">{profile?.availability ?? PROFILE.availability}</div></div>
            </div>

            <div className="focus-list" data-reveal>
              {FOCUS.map((item) => <span className="tag" key={item}>{item}</span>)}
            </div>

            {btech && (
              <div className="education-primary" data-reveal>
                <div className="education-primary-meta"><span className="eyebrow">Education</span><span className="education-primary-grade">{btech.grade}</span></div>
                <h4>{btech.degree}</h4>
                <p>{btech.institution}</p>
                <small>{btech.startYear} — {btech.endYear ?? "Present"}</small>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}