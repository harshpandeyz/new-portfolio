import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { FLAGSHIP_SLUGS, type PublicProject, type Skill } from "@hp/shared";
import { PROFILE } from "../../app/constants";
import { IconExternal, IconGithub, IconLinkedIn, IconMail } from "../../components/ui/icons";
import { api, resolveMediaUrl } from "../../lib/api";
import { formatTaxonomy } from "../../lib/format";
import { useData } from "../../lib/data";
import { CCTV_SLUG } from "../projects/flagshipConfig";
import "./recruiter.css";

export interface RecruiterProps {
  onViewResume: () => void;
}

const SKILL_CATEGORIES = ["LANGUAGES", "FRONTEND", "BACKEND", "DATABASES", "AI_ML", "CLOUD_DEVOPS", "SECURITY", "MOBILE", "BLOCKCHAIN", "EXPERIMENTAL"];
const RESUME_SKILL_NAMES = new Set([
  "Python", "React.js", "FastAPI", "MongoDB", "Computer Vision", "YOLOv8", "OpenCV",
  "LLM API integration", "Evidence integrity (AES/SHA-256)",
]);
const RESUME_STACK_NAMES = new Set(["TypeScript", "Redis", "Docker", "SSE", "JSON Schema", "Pytest"]);

function normalizeTechnology(value: string): string {
  return value.toLowerCase().replace(/\b\d+(?:\.\d+)*\b/g, "").replace(/[^a-z0-9]/g, "");
}

/** Match only exact technology labels, allowing common spelling/version variants. */
function stackMatchesSkill(skillName: string, stackName: string): boolean {
  const skill = normalizeTechnology(skillName);
  const stack = normalizeTechnology(stackName);
  if (skill === stack) return true;
  return (skill === "reactjs" && stack === "react") ||
    (skill === "python" && stack.startsWith("python")) ||
    (skill === "dockercompose" && stack === "dockercompose");
}

function ProjectGlyph({ slug }: { slug: string }) {
  if (slug === "orchestraai") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="5" cy="12" r="2.1" /><circle cx="19" cy="6" r="2.1" /><circle cx="19" cy="18" r="2.1" /><path d="M7.2 11.2 16.8 6.8M7.2 12.8l9.6 4.4" />
    </svg>
  );
  if (slug === "senseline") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 13h3l2-6 4 11 3-8 2 3h4" /><path d="M3 20h18" opacity=".45" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h13A2.5 2.5 0 0 1 21 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5z" /><circle cx="12" cy="12.5" r="3.4" /><path d="M7 6V4h3" />
    </svg>
  );
}

function PrintGlyph() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" /><path d="M7 14h10v7H7zM18 12h.01" /></svg>;
}

function PreviewGlyph() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 12s3.2-6 9.5-6 9.5 6 9.5 6-3.2 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.6" /></svg>;
}

function HeaderIconLink({ href, label, children, external = false }: {
  href: string;
  label: string;
    children: ReactNode;
  external?: boolean;
}) {
  return (
    <a
      className="resume-icon-link"
      href={href}
      aria-label={label}
      data-tooltip={label}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  );
}

function ProjectEntry({
  project, index, pinned, onPin, onHover, onFocus, onBlur,
}: {
  project: PublicProject;
  index: number;
  pinned: boolean;
  onPin: (slug: string) => void;
  onHover: (slug: string | null) => void;
  onFocus: (slug: string) => void;
  onBlur: (slug: string) => void;
}) {
  const isCctv = project.slug === CCTV_SLUG;
  const title = isCctv ? project.codename || project.title : project.title;
  const subtitle = isCctv ? project.title : project.codename;
  const stack = project.stack.slice(0, 5);

  return (
    <article
      className="resume-project"
      data-project-slug={project.slug}
      onPointerEnter={(event) => { if (event.pointerType === "mouse") onHover(project.slug); }}
      onPointerLeave={(event) => { if (event.pointerType === "mouse") onHover(null); }}
      onPointerUp={(event) => {
        const target = event.target;
        if (event.pointerType === "touch" && !(target instanceof Element && target.closest("a, button"))) onPin(project.slug);
      }}
      onFocusCapture={() => onFocus(project.slug)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur(project.slug);
      }}
    >
      <span className="resume-project-mark"><ProjectGlyph slug={project.slug} /></span>
      <div className="resume-project-content">
        <div className="resume-project-heading">
          <span className="resume-project-index">{String(index + 1).padStart(2, "0")}</span>
          <h3>
            <button
              className="resume-project-select"
              type="button"
              aria-label={`Highlight skills used in ${title}`}
              aria-pressed={pinned}
              onPointerUp={(event) => {
                if (event.pointerType === "touch") onBlur(project.slug);
              }}
              onClick={() => onPin(project.slug)}
            >{title}</button>
          </h3>
          {subtitle && <span className="resume-project-subtitle">{subtitle}</span>}
        </div>
        <p>{project.shortDescription}</p>
        <div className="resume-project-bottom">
          <div className="resume-project-tags" aria-label="Project technologies">
            {stack.map((technology) => <span key={technology}>{technology}</span>)}
          </div>
          <div className="resume-project-links">
            {project.githubUrl && <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">GitHub <IconExternal /></a>}
            <Link to={`/projects/${project.slug}`}>Case study <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </div>
    </article>
  );
}

/** One-page résumé view with project-driven skill highlighting. */
export function Recruiter({ onViewResume }: RecruiterProps) {
  const { profile, projects, skills, education, loaded, error, refresh } = useData();
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null);
  const [pinnedSlug, setPinnedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (loaded) void api.track("recruiter_view");
  }, [loaded]);

  const name = profile?.name ?? PROFILE.name;
  const email = profile?.email ?? PROFILE.email;
  const location = profile?.location ?? PROFILE.location;
  const headline = profile?.headline ?? PROFILE.headline;
  const summary = profile?.recruiterSummary || PROFILE.recruiterSummary;
  const resumeUrl = resolveMediaUrl(profile?.resumeUrl ?? PROFILE.resume.path);
  const resumeLabel = profile?.resumeLabel ?? PROFILE.resume.label;
  const social = (label: string) => profile?.socials.find((item) => item.label.toLowerCase() === label)?.url;
  const githubUrl = social("github") ?? PROFILE.socials.github.url;
  const linkedInUrl = social("linkedin") ?? PROFILE.socials.linkedin.url;

  const featuredProjects = useMemo(
    () => FLAGSHIP_SLUGS.map((slug) => projects.find((project) => project.slug === slug)).filter((project): project is PublicProject => Boolean(project)),
    [projects],
  );
  const projectBySlug = useMemo(() => new Map(featuredProjects.map((project) => [project.slug, project])), [featuredProjects]);
  const relevantSkills = useMemo(
    () => skills.filter((skill) => skill.recruiterPriority > 0 || RESUME_SKILL_NAMES.has(skill.name)),
    [skills],
  );
  const skillGroups = useMemo(() => SKILL_CATEGORIES.map((category) => ({
    category,
    items: relevantSkills.filter((skill) => skill.category === category).sort((a, b) => a.recruiterPriority > 0 && b.recruiterPriority > 0 ? a.recruiterPriority - b.recruiterPriority : a.name.localeCompare(b.name)),
  })).filter((group) => group.items.length), [relevantSkills]);
  const unclassifiedStack = useMemo(() => {
    const stackByTechnology = new Map<string, { technology: string; slugs: string[] }>();
    featuredProjects.forEach((project) => project.stack.forEach((technology) => {
      if (relevantSkills.some((skill) => stackMatchesSkill(skill.name, technology))) return;
      if (!RESUME_STACK_NAMES.has(technology)) return;
      const normalized = normalizeTechnology(technology);
      const current = stackByTechnology.get(normalized);
      if (current) {
        if (!current.slugs.includes(project.slug)) current.slugs.push(project.slug);
      } else if (normalized) stackByTechnology.set(normalized, { technology, slugs: [project.slug] });
    }));
    return [...stackByTechnology.values()];
  }, [featuredProjects, relevantSkills]);

  const activeProjectSlug = hoveredSlug ?? focusedSlug ?? pinnedSlug;
  const activeProject = activeProjectSlug ? projectBySlug.get(activeProjectSlug) : undefined;
  const primaryEducation = education.find((item) => item.primary);
  const featuredSource = "Selected commit 5394dfc78b: a snapshot tool using a DEMO mock and SSRF-guarded fetch.";
  const setHover = (slug: string | null) => setHoveredSlug(slug);
  const setFocus = (slug: string) => setFocusedSlug(slug);
  const clearFocus = (slug: string) => setFocusedSlug((current) => current === slug ? null : current);
  const togglePinned = (slug: string) => setPinnedSlug((current) => current === slug ? null : slug);
  const skillUsesProject = (skill: Skill, slug: string) => {
    const project = projectBySlug.get(slug);
    return skill.usedInProjectSlugs.includes(slug) || Boolean(project?.stack.some((technology) => stackMatchesSkill(skill.name, technology)));
  };

  return (
    <div className="recruiter-page resume-page">
      <div className="resume-shell">
        <header className="resume-header">
          <Link to="/" className="resume-identity" aria-label="Return to Harsh Pandey portfolio">
            <h1>{name}</h1><span>{headline}</span>
          </Link>
          <div className="resume-header-actions">
            <nav className="resume-socials" aria-label="Contact and social links">
              <HeaderIconLink href={githubUrl} label="GitHub profile" external><IconGithub /></HeaderIconLink>
              <HeaderIconLink href={linkedInUrl} label="LinkedIn profile" external><IconLinkedIn /></HeaderIconLink>
              <HeaderIconLink href={`mailto:${email}`} label={`Email ${email}`}><IconMail /></HeaderIconLink>
            </nav>
            <span className="resume-header-divider" aria-hidden="true" />
            <button className="resume-icon-link resume-screen-action" type="button" aria-label="Preview résumé" data-tooltip="Preview résumé" onClick={onViewResume}><PreviewGlyph /></button>
            <button className="resume-icon-link resume-screen-action" type="button" aria-label="Print résumé" data-tooltip="Print résumé" onClick={() => window.print()}><PrintGlyph /></button>
            <a className="resume-download" href={resumeUrl} download aria-label={`Download ${resumeLabel}`}><span>Download résumé</span><span aria-hidden="true">↓</span></a>
          </div>
        </header>

        <div className="resume-print-contact" aria-hidden="true">{email} · {githubUrl.replace(/^https?:\/\//, "")} · {linkedInUrl.replace(/^https?:\/\//, "")}</div>

        {error && <p className="resume-notice" role="status">Some profile details could not refresh. Showing saved content. <button type="button" onClick={() => void refresh()}>Retry</button></p>}

        <div className="resume-layout">
          <main className="resume-main">
            <section className="resume-section resume-summary" aria-labelledby="resume-summary-title">
              <h2 id="resume-summary-title" className="resume-section-title">Professional summary</h2>
              <p>{summary}</p>
              <span className="resume-location">{location} <i aria-hidden="true" /> {profile?.availability ?? PROFILE.availability}</span>
            </section>

            <section className="resume-section resume-projects" aria-labelledby="resume-projects-title">
              <h2 id="resume-projects-title" className="resume-section-title">Featured projects</h2>
              <div className="resume-project-list">
                {featuredProjects.map((project, index) => (
                  <ProjectEntry
                    key={project.id}
                    project={project}
                    index={index}
                    pinned={pinnedSlug === project.slug}
                    onPin={togglePinned}
                    onHover={setHover}
                    onFocus={setFocus}
                    onBlur={clearFocus}
                  />
                ))}
              </div>
              {featuredProjects.length === 0 && <p className="resume-muted" role="status">Featured project records are loading.</p>}
            </section>

            <section className="resume-section resume-education" aria-labelledby="resume-education-title">
              <h2 id="resume-education-title" className="resume-section-title">Education</h2>
              {primaryEducation ? (
                <div className="resume-education-row">
                  <div><h3>{primaryEducation.degree}</h3><p>{primaryEducation.institution}{primaryEducation.field ? ` · ${primaryEducation.field}` : ""}</p></div>
                  <div className="resume-education-meta"><span>{primaryEducation.startYear}–{primaryEducation.endYear ?? "Present"}</span>{primaryEducation.grade && <strong>{/^CGPA/i.test(primaryEducation.grade) ? primaryEducation.grade : `CGPA ${primaryEducation.grade}`}</strong>}</div>
                </div>
              ) : <p className="resume-muted">Education record unavailable.</p>}
            </section>

            <section className="resume-section resume-open-source" aria-labelledby="resume-open-source-title">
              <p className="resume-open-source-kicker">Open-source contribution</p>
              <h2 id="resume-open-source-title" className="resume-section-title">XERJ Corpus Hub</h2>
              <p>{featuredSource}</p>
              <div className="resume-open-source-links">
                <a href="https://hub.xerj.org/contributors/harshpandeyz" target="_blank" rel="noopener noreferrer">Verify contribution <IconExternal /></a>
                <a href="https://github.com/harshpandeyz/OrchestraAI/commit/5394dfc78b" target="_blank" rel="noopener noreferrer">Selected commit <IconGithub /></a>
              </div>
            </section>
          </main>

          <aside className="resume-sidebar">
            <section className="resume-section resume-skills" aria-labelledby="resume-skills-title">
              <h2 id="resume-skills-title" className="resume-section-title">Technical skills</h2>
              <p className="resume-skill-hint" role="status" aria-live="polite"><span>Skills used in this project</span><i aria-hidden="true" />{activeProject ? activeProject.codename || activeProject.title : "Hover, focus or tap a project"}</p>
              <p className="resume-print-skill-hint">Skills linked to project records.</p>
              <div className="resume-skill-groups">
                {skillGroups.map((group) => (
                  <div className="resume-skill-group" key={group.category}>
                    <h3>{formatTaxonomy(group.category)}</h3>
                    <div className="resume-skill-chips">
                      {group.items.map((skill) => {
                        const relevant = activeProjectSlug ? skillUsesProject(skill, activeProjectSlug) : false;
                        return <span className={`resume-skill-chip${activeProjectSlug ? relevant ? " is-relevant" : " is-muted" : ""}`} key={skill.id}>{skill.name}</span>;
                      })}
                    </div>
                  </div>
                ))}
                {unclassifiedStack.length > 0 && <div className="resume-skill-group resume-stack-group">
                  <h3>Project stack records</h3>
                  <div className="resume-skill-chips">
                    {unclassifiedStack.map(({ technology, slugs }) => {
                      const relevant = activeProjectSlug ? slugs.includes(activeProjectSlug) : false;
                      return <span className={`resume-skill-chip${activeProjectSlug ? relevant ? " is-relevant" : " is-muted" : ""}`} key={normalizeTechnology(technology)}>{technology}</span>;
                    })}
                  </div>
                </div>}
              </div>
            </section>

            <section className="resume-section resume-capabilities" aria-labelledby="resume-capabilities-title">
              <h2 id="resume-capabilities-title" className="resume-section-title">Core engineering</h2>
              <ul>
                <li><span>Agent runtimes, model routing and tool execution</span><Link to="/projects/orchestraai">OrchestraAI ↗</Link></li>
                <li><span>Evaluation design, independent grading and test isolation</span><Link to="/projects/senseline">SENSELINE ↗</Link></li>
                <li><span>Backend services, persistence and real-time event flows</span><Link to="/projects/orchestraai">OrchestraAI ↗</Link></li>
                <li><span>Computer vision and cryptographic evidence integrity</span><Link to={`/projects/${CCTV_SLUG}`}>CCTV-X ↗</Link></li>
              </ul>
            </section>

          </aside>
        </div>

        <footer className="resume-footer"><span>{name}</span><span>{location}</span><a href={`mailto:${email}`}>{email}</a></footer>
      </div>
    </div>
  );
}
