import { useEffect } from "react";
import { Link } from "react-router-dom";

import { resolveMediaUrl } from "../../lib/api";
import { formatTaxonomy } from "../../lib/format";
import { useData } from "../../lib/data";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { PROFILE } from "../../app/constants";
import { IconExternal, IconGithub, IconLinkedIn, IconMail } from "../../components/ui/icons";

export interface RecruiterProps {
  onViewResume: () => void;
}

/**
 * Intentional, intentionally-boring fast summary for recruiters.
 * Everything a recruiter needs in ~30 seconds; printable, factual, and the
 * résumé download/view is prominent. No certificate-count competition.
 */
export function Recruiter({ onViewResume }: RecruiterProps) {
  const { profile, projects, skills, education } = useData();

  useEffect(() => {
    document.title = `${profile?.name ?? "Harsh Pandey"} — Résumé`;
    void api.track("recruiter_view");
    return () => { document.title = "Harsh Pandey — Software Engineer"; };
  }, [profile?.name]);

  const top = projects.filter((p) => p.tier === "featured").slice(0, 4);
  const skillGroups = ["BACKEND", "AI_ML", "FRONTEND", "CLOUD_DEVOPS", "DATABASES"].map((category) => ({
    category,
    items: skills.filter((skill) => skill.category === category && (skill.featured || skill.level === "core")).map((skill) => skill.name),
  })).filter((group) => group.items.length);

  const social = (label: string) => profile?.socials.find((s) => s.label.toLowerCase() === label.toLowerCase())?.url;
  const resumePath = profile?.resumeUrl ?? PROFILE.resume.path;
  const email = profile?.email ?? PROFILE.email;

  return (
    <div className="recruiter-page">
      <div className="container recruiter-inner">
        <header className="recruiter-header">
          <Link to="/" className="brand">{profile?.name ?? PROFILE.name}</Link>
          <div className="recruiter-header-actions">
            <Button onClick={onViewResume}>View résumé</Button>
            <Button href={resolveMediaUrl(resumePath)} download>Download résumé</Button>
            <Link className="btn btn-sm btn-ghost" to="/">Full portfolio ↗</Link>
          </div>
        </header>

        <section className="recruiter-intro">
          <span className="eyebrow">Résumé</span>
          <h1>{profile?.name ?? PROFILE.name}</h1>
          <p className="recruiter-role">Software Engineer · Backend · AI · Full Stack</p>
          <p className="recruiter-summary">I build reliable backend systems, applied AI products and thoughtful full-stack experiences end to end. I'm completing my B.Tech in Information Technology at MIT-ADT University, Pune, and am open to backend, full-stack and AI/ML opportunities.</p>
          <div className="recruiter-contact">
            <a href={`mailto:${email}`}><IconMail /> {email}</a>
            <span>{profile?.location ?? PROFILE.location}</span>
            <a href={social("github") ?? PROFILE.socials.github.url} target="_blank" rel="noopener noreferrer"><IconGithub /> GitHub</a>
            <a href={social("linkedin") ?? PROFILE.socials.linkedin.url} target="_blank" rel="noopener noreferrer"><IconLinkedIn /> LinkedIn</a>
          </div>
        </section>

        <div className="recruiter-grid">
          <section>
            <div className="recruiter-section-title"><span>01</span><h2>Selected work</h2></div>
            <div className="recruiter-projects">
              {top.map((project) => (
                <Link key={project.id} to={`/projects/${project.slug}`}>
                  <div>
                    <h3>{project.title}</h3>
                    <p>{project.shortDescription}</p>
                    <small>{project.stack.slice(0, 6).join(" · ")}</small>
                  </div>
                  <IconExternal />
                </Link>
              ))}
            </div>
          </section>

          <section>
            <div className="recruiter-section-title"><span>02</span><h2>Capabilities</h2></div>
            <div className="recruiter-skills">
              {skillGroups.map((group) => (
                <div key={group.category}>
                  <h3>{formatTaxonomy(group.category)}</h3>
                  <p>{group.items.join(" · ")}</p>
                </div>
              ))}
            </div>

            <div className="recruiter-section-title second"><span>03</span><h2>Education</h2></div>
            {education.map((item) => (
              <div className="recruiter-education" key={item.id}>
                <h3>{item.degree}</h3>
                <p>{item.institution}</p>
                <small>{item.startYear} — {item.endYear ?? "Present"}{item.grade ? ` · ${item.grade}` : ""}</small>
              </div>
            ))}
          </section>
        </div>

        <footer className="recruiter-footer">
          <span>{profile?.name ?? "Harsh Pandey"} · Software Engineer</span>
          <a href={`mailto:${email}`}>Get in touch</a>
        </footer>
      </div>
    </div>
  );
}