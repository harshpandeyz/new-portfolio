import { useEffect } from "react";
import { Link } from "react-router-dom";

import { resolveMediaUrl } from "../../lib/api";
import { formatTaxonomy } from "../../lib/format";
import { useData } from "../../lib/data";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { PROFILE } from "../../app/constants";
import { resolveRecruiterProjects } from "@hp/shared";
import { IconExternal, IconGithub, IconLinkedIn, IconMail } from "../../components/ui/icons";
import "./recruiter.css";

export interface RecruiterProps {
  onViewResume: () => void;
}

/**
 * Premium recruiter briefing — 30–60 second scan.
 * Editorial grid: identity → at-a-glance → signature evidence → capabilities
 * → education/experience → contact. Same intentional project hierarchy as
 * the homepage (never the first four featured records).
 */
export function Recruiter({ onViewResume }: RecruiterProps) {
  const { profile, projects, skills, education, timeline, timelineLoaded, timelineError, loadTimeline, certificates, error, refresh, loaded } = useData();

  useEffect(() => {
    if (loaded) void api.track("recruiter_view");
  }, [loaded]);

  useEffect(() => { void loadTimeline(); }, [loadTimeline]);

  const top = resolveRecruiterProjects(projects);
  const prioritizedSkills = skills
    .filter((skill) => skill.recruiterPriority > 0)
    .sort((a, b) => a.recruiterPriority - b.recruiterPriority);
  const skillGroups = ["BACKEND", "AI_ML", "FRONTEND", "DATABASES", "LANGUAGES", "CLOUD_DEVOPS", "SECURITY"].map((category) => ({
    category,
    items: prioritizedSkills
      .filter((skill) => skill.category === category)
      .map((skill) => skill.name),
  })).filter((group) => group.items.length);

  const experience = timeline.filter((t) => t.type === "experience").slice(0, 3);

  const social = (label: string) => profile?.socials.find((s) => s.label.toLowerCase() === label.toLowerCase())?.url;
  const resumePath = profile?.resumeUrl ?? PROFILE.resume.path;
  const email = profile?.email ?? PROFILE.email;
  const headline = profile?.headline ?? PROFILE.headline;
  const positioning = profile?.subHeadline ?? PROFILE.positioning;
  const summary = profile?.recruiterSummary || PROFILE.recruiterSummary;
  const availability = profile?.availability ?? PROFILE.availability;
  const location = profile?.location ?? PROFILE.location;
  const strongest = prioritizedSkills.slice(0, 4).map((skill) => skill.name);
  const featuredCerts = certificates.filter((c) => c.featured).slice(0, 4);
  const edu = education.find((item) => item.primary);

  return (
    <div className="recruiter-page">
      <div className="container recruiter-inner">
        <header className="recruiter-header">
          <Link to="/" className="brand">{profile?.name ?? PROFILE.name}</Link>
          <div className="recruiter-header-actions">
            <Button href={resolveMediaUrl(resumePath)} download>Download résumé</Button>
            <Link className="btn btn-sm btn-ghost" to="/">Full portfolio ↗</Link>
          </div>
        </header>

        <section className="recruiter-intro">
          <span className="eyebrow">Recruiter briefing · 60-second scan</span>
          <h1>{profile?.name ?? PROFILE.name}</h1>
          <p className="recruiter-role">{headline} — {positioning}</p>
          <p className="recruiter-summary">{summary}</p>
          <div className="recruiter-cta">
            <Button variant="primary" href={`mailto:${email}`}>Contact</Button>
            <Button onClick={onViewResume}>View résumé</Button>
          </div>
        </section>

        {error && <p className="recruiter-stale" role="status">Some portfolio details couldn't refresh. Showing available saved content. <button type="button" onClick={() => void refresh()}>Try again</button></p>}

        <section className="recruiter-glance" aria-label="At a glance">
          <div>
            <span>Availability</span>
            <strong className="glance-avail"><i aria-hidden="true" />{availability}</strong>
          </div>
          <div>
            <span>Location</span>
            <strong>{location}</strong>
          </div>
          <div>
            <span>Education</span>
            <strong>{edu ? `${edu.degree} · ${edu.endYear ?? "Present"}` : "Education not listed"}</strong>
            <small>{edu ? `${edu.institution}${edu.grade ? ` · ${edu.grade}` : ""}` : ""}</small>
          </div>
          <div>
            <span>Strongest</span>
            <strong className="glance-skills">{strongest.slice(0, 4).join(" · ")}</strong>
          </div>
        </section>

        <div className="recruiter-grid">
          <section aria-label="Signature projects">
            <div className="recruiter-section-title"><span>01</span><h2>Signature evidence</h2></div>
            <p className="recruiter-hint">Four systems that prove backend depth, applied AI, and end-to-end ownership.</p>
            <div className="recruiter-projects">
              {top.map((project, i) => (
                <Link key={project.id} to={`/projects/${project.slug}`}>
                  <div>
                    <span className="rp-num">{String(i + 1).padStart(2, "0")} — {i < 2 ? "FLAGSHIP" : "SELECTED"}</span>
                    <h3>{project.title}{project.codename ? ` · ${project.codename}` : ""}</h3>
                    <p>{project.shortDescription}</p>
                    <small>{project.stack.slice(0, 5).join(" · ")} · {project.status}</small>
                  </div>
                  <IconExternal />
                </Link>
              ))}
            </div>

            {timelineError ? (
              <p role="status">{timelineError} <button type="button" onClick={() => void loadTimeline()}>Retry</button></p>
            ) : !timelineLoaded ? (
              <p role="status">Loading experience…</p>
            ) : experience.length > 0 ? (
              <>
                <div className="recruiter-section-title second"><span>02</span><h2>Experience</h2></div>
                {experience.map((item) => (
                  <div className="recruiter-education" key={item.id}>
                    <h3>{item.title}</h3>
                    <p>{item.organization ?? ""}</p>
                    <small>{item.date}{item.endDate ? ` — ${item.endDate}` : ""}</small>
                  </div>
                ))}
              </>
            ) : <p>Experience details are not listed.</p>}

                <div className="recruiter-section-title second"><span>{experience.length > 0 ? "03" : "02"}</span><h2>Education</h2></div>
            {[...education].sort((a, b) => Number(b.primary) - Number(a.primary) || a.order - b.order).map((item) => (
              <div className="recruiter-education" key={item.id}>
                <h3>{item.degree}</h3>
                <p>{item.institution}{item.field ? ` · ${item.field}` : ""}</p>
                <small>{item.startYear} — {item.endYear ?? "Present"}{item.grade ? ` · ${item.grade}` : ""}</small>
              </div>
            ))}
          </section>

          <aside aria-label="Capabilities and contact">
            <div className="recruiter-section-title"><span>A</span><h2>Capabilities</h2></div>
            <div className="recruiter-skills recruiter-skills--chips">
              {skillGroups.map((group) => (
                <div key={group.category}>
                  <h3>{formatTaxonomy(group.category)}</h3>
                  <div className="chip-row">
                    {group.items.map((name) => <span key={name} className="mini-chip">{name}</span>)}
                  </div>
                </div>
              ))}
            </div>

            {featuredCerts.length > 0 && (
              <>
                <div className="recruiter-section-title second"><span>B</span><h2>Selected credentials</h2></div>
                <div className="recruiter-credentials-list">
                  {featuredCerts.map((c) => (
                    <div key={c.id} className="recruiter-credential">
                      <h3>{c.title}</h3>
                      <p>{c.issuer}{c.issuedOn ? ` · ${c.issuedOn}` : ""}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="recruiter-section-title second"><span>C</span><h2>Contact</h2></div>
            <div className="recruiter-contact recruiter-contact--card">
              <a href={`mailto:${email}`}><IconMail /> {email}</a>
              <a href={social("github") ?? PROFILE.socials.github.url} target="_blank" rel="noopener noreferrer"><IconGithub /> GitHub</a>
              <a href={social("linkedin") ?? PROFILE.socials.linkedin.url} target="_blank" rel="noopener noreferrer"><IconLinkedIn /> LinkedIn</a>
              <span className="rc-loc">{location}</span>
            </div>
          </aside>
        </div>

        <footer className="recruiter-footer">
          <span>{profile?.name ?? "Harsh Pandey"} · {headline}</span>
          <a href={`mailto:${email}`}>Get in touch</a>
        </footer>
      </div>
    </div>
  );
}
