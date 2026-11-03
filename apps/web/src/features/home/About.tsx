import { useData } from "../../lib/data";
import { resolveMediaUrl } from "../../lib/api";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { PROFILE } from "../../app/constants";

/**
 * A compact editorial profile. Education is integrated into the same two
 * column composition so it stays easy to find without adding another page band.
 */
export function About() {
  const { profile, education } = useData();
  const primaryEducation = education.find((item) => item.primary);

  return (
    <section className="section about-section" id="about" aria-label="About Harsh">
      <div className="container">
        <SectionHeader
          eyebrow="About"
          title="An engineer who builds systems end to end."
          sub="Backend depth, applied AI, and the small disciplines that turn working code into dependable software."
        />

        <div className="id-grid">
          <figure className="id-photo">
            {profile?.avatarUrl ? <img src={resolveMediaUrl(profile.avatarUrl)} alt={`Portrait of ${profile.name}`} loading="lazy" width={880} height={1100} /> : <div className="photo-placeholder">HP</div>}
            <figcaption className="id-caption">
              <span>{profile?.location ?? PROFILE.location}</span>
              {primaryEducation && <span>{primaryEducation.institution}</span>}
            </figcaption>
          </figure>

          <div className="id-copy">
            <blockquote className="id-quote">
              I'd rather trace a bug to its root cause than work around it.
            </blockquote>

            <p>{profile?.bio ?? "I build backend systems, applied AI products, and thoughtful full-stack applications."}</p>

            <div className="id-facts">
              <div className="fact"><div className="k">Based in</div><div className="v">{profile?.location ?? PROFILE.location}</div></div>
              <div className="fact"><div className="k">Focus</div><div className="v">Backend · AI · Full Stack</div></div>
            </div>

            {primaryEducation && (
              <article className="about-education" id="journey" aria-label="Education">
                <div className="about-education-mark" aria-hidden="true">EDU</div>
                <div className="about-education-main">
                  <span className="about-education-kicker">Education · {primaryEducation.institution}</span>
                  <h3>{primaryEducation.degree}</h3>
                  <p>{primaryEducation.field ?? "Information Technology"} · {primaryEducation.startYear}–{primaryEducation.endYear ?? "Present"}</p>
                </div>
                {primaryEducation.grade && (
                  <div className="about-education-grade">
                    <span>Verified CGPA</span>
                    <strong>{primaryEducation.grade.replace(/^CGPA\s*/i, "")}</strong>
                  </div>
                )}
              </article>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
