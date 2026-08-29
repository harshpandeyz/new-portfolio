import { useEffect } from "react";
import { Link } from "react-router-dom";
import { api, resolveMediaUrl } from "../../lib/api";
import { formatTaxonomy } from "../../lib/format";
import { useData } from "../../lib/data";

export function Recruiter() {
  const { profile, projects, skills, education, certTotal } = useData();
  useEffect(() => { document.title = "Harsh Pandey — Résumé"; void api.track("recruiter_view"); return () => { document.title = "Harsh Pandey — Software Engineer"; }; }, []);
  const top = projects.filter((p) => p.tier === "featured").slice(0, 4);
  const skillGroups = ["BACKEND", "AI_ML", "FRONTEND", "CLOUD_DEVOPS"].map((category) => ({ category, items: skills.filter((skill) => skill.category === category && (skill.featured || skill.level === "core")).map((skill) => skill.name) })).filter((group) => group.items.length);
  return <div className="recruiter-page"><div className="container recruiter-inner">
    <header className="recruiter-header"><Link to="/" className="brand">Harsh Pandey</Link><div><a className="btn btn-sm btn-solid" href={resolveMediaUrl("/files/HARSH-RESUME.pdf")} target="_blank" rel="noopener noreferrer">Download résumé ↓</a><Link className="btn btn-sm" to="/">Full portfolio ↗</Link></div></header>
    <section className="recruiter-intro"><span className="eyebrow">Résumé</span><h1>{profile?.name ?? "Harsh Pandey"}</h1><p className="recruiter-role">Software Engineer · Backend · AI · Full Stack</p><p className="recruiter-summary">I build reliable backend systems, applied AI products, and thoughtful full-stack experiences. I’m currently completing my B.Tech in Information Technology at MIT-ADT University, Pune.</p><div className="recruiter-contact"><a href={`mailto:${profile?.email ?? "harshap17058@gmail.com"}`}>{profile?.email ?? "harshap17058@gmail.com"}</a><span>{profile?.location ?? "Pune, India"}</span><a href="https://github.com/harshpandeyz" target="_blank" rel="noopener noreferrer">GitHub ↗</a><a href="https://www.linkedin.com/in/harshpandeyz/" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a></div></section>
    <div className="recruiter-grid"><section><div className="recruiter-section-title"><span>01</span><h2>Selected work</h2></div><div className="recruiter-projects">{top.map((project) => <Link key={project.id} to={`/projects/${project.slug}`}><div><h3>{project.title}</h3><p>{project.shortDescription}</p><small>{project.stack.slice(0, 6).join(" · ")}</small></div><b>↗</b></Link>)}</div></section><section><div className="recruiter-section-title"><span>02</span><h2>Capabilities</h2></div><div className="recruiter-skills">{skillGroups.map((group) => <div key={group.category}><h3>{formatTaxonomy(group.category)}</h3><p>{group.items.join(" · ")}</p></div>)}</div><div className="recruiter-section-title second"><span>03</span><h2>Education</h2></div>{education.map((item) => <div className="recruiter-education" key={item.id}><h3>{item.degree}</h3><p>{item.institution}</p><small>{item.startYear} — {item.endYear ?? "Present"}{item.grade ? ` · ${item.grade}` : ""}</small></div>)}<div className="recruiter-credentials"><strong>{certTotal}</strong><span>verified credentials</span></div></section></div>
    <footer className="recruiter-footer"><span>Harsh Pandey · Software Engineer</span><a href={`mailto:${profile?.email ?? "harshap17058@gmail.com"}`}>Get in touch ↗</a></footer>
  </div></div>;
}
