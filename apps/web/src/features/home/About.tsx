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
              {primaryEducation && <span>{primaryEducation.degree}, {primaryEducation.institution} · Class of {primaryEducation.endYear ?? "present"}</span>}
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
              <div className="fact"><div className="k">Availability</div><div className="v availability">{profile?.availability ?? PROFILE.availability}</div></div>
            </div>

            <div className="id-focus">
              {FOCUS.map((item) => <span className="tag" key={item}>{item}</span>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
