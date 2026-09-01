import { useData } from "../../lib/data";
import { resolveMediaUrl } from "../../lib/api";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { PROFILE } from "../../app/constants";

const FOCUS = ["Backend systems", "Applied AI", "Full-stack applications", "System design", "Deployment"];

/**
 * About is an editorial profile, not a second résumé: who Harsh is as an
 * engineer, what he enjoys solving, how he works, and what he's after — in
 * prose, with a portrait and a pull-quote. It sits immediately after the hero.
 */
export function About() {
  const { profile, education } = useData();
  const btech = education.find((e) => e.startYear === "2023" && e.field?.includes("Software")) ?? education[0];

  return (
    <section className="section about-section" id="about" aria-label="About Harsh">
      <div className="container">
        <SectionHeader
          eyebrow="About"
          title="An engineer who builds systems end to end."
          sub="Backend depth, applied AI, and the small disciplines that turn working code into dependable software."
        />

        <div className="id-grid">
          <figure className="id-photo" data-reveal>
            {profile?.avatarUrl ? <img src={resolveMediaUrl(profile.avatarUrl)} alt={`Portrait of ${profile.name}`} loading="lazy" width={880} height={1100} /> : <div className="photo-placeholder">HP</div>}
            <figcaption className="id-caption">
              <span>{profile?.location ?? PROFILE.location}</span>
              <span>B.Tech IT, MIT-ADT · Class of 2027</span>
            </figcaption>
          </figure>

          <div className="id-copy">
            <blockquote className="id-quote" data-reveal>
              I'd rather trace a bug to its root cause than work around it.
            </blockquote>

            <p data-reveal>
              I'm a final-year software engineer who carries a system from the first schema to a running
              deployment. Recent work spans the stack — training a YOLOv8 model, writing the REST API that
              serves its output, containerizing the whole thing, and pairing it with an evidence pipeline that
              stands up to scrutiny.
            </p>
            <p data-reveal>
              Comfortable across Java/Spring Boot and Node.js/Express on the backend, React on the frontend,
              FastAPI for AI-facing services, and SQL/NoSQL stores with CI/CD in between. When a project needs a
              stack I haven't used, I learn it quickly enough to ship with it — I taught myself Swift/UIKit to
              build an iOS game end to end.
            </p>
            <p data-reveal>
              Right now I'm completing my B.Tech in Information Technology at MIT-ADT University, Pune, and open
              to full-stack, backend, and AI/ML engineering roles where the work matters beyond the demo.
            </p>

            <div className="id-facts" data-reveal>
              <div className="fact"><div className="k">Based in</div><div className="v">{profile?.location ?? PROFILE.location}</div></div>
              <div className="fact"><div className="k">Focus</div><div className="v">Backend · AI · Full Stack</div></div>
              <div className="fact"><div className="k">Availability</div><div className="v availability">{profile?.availability ?? PROFILE.availability}</div></div>
            </div>

            <div className="id-focus" data-reveal>
              {FOCUS.map((item) => <span className="tag" key={item}>{item}</span>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}