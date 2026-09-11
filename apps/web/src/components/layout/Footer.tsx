import { useNavigate, useLocation } from "react-router-dom";
import { useData } from "../../lib/data";
import { PROFILE, WHATSAPP_HREF, WHATSAPP_CONFIGURED } from "../../app/constants";
import { Button } from "../ui/Button";
import { IconGithub, IconLinkedIn, IconMail, IconWhatsApp } from "../ui/icons";

export interface FooterProps {
  onViewResume: () => void;
}

/** Minimal, useful footer: identity, navigation, socials, résumé. */
export function Footer({ onViewResume }: FooterProps) {
  const { profile } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const social = (label: string) => profile?.socials.find((s) => s.label.toLowerCase() === label.toLowerCase())?.url;

  const goSection = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname !== "/") {
      navigate(`/#${id}`);
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 220);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      window.history.replaceState(null, "", `#${id}`);
    }
  };

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-identity">
          <strong>{profile?.name ?? PROFILE.name}</strong>
          <span>{profile ? `${profile.headline} · ${profile.location}` : "Software Engineer · Backend · Applied AI"}</span>
        </div>

        <nav className="footer-nav" aria-label="Footer">
          <a href="/#work" onClick={goSection("work")}>Work</a>
          <a href="/#about" onClick={goSection("about")}>About</a>
          <a href="/#journey" onClick={goSection("journey")}>Education</a>
          <a href="/#tech" onClick={goSection("tech")}>Tech</a>
          <a href="/#credentials" onClick={goSection("credentials")}>Credentials</a>
          <a href="/#contact" onClick={goSection("contact")}>Contact</a>
        </nav>

        <div className="footer-socials">
          <a href={social("github") ?? PROFILE.socials.github.url} target="_blank" rel="noopener noreferrer" aria-label="GitHub"><IconGithub /></a>
          <a href={social("linkedin") ?? PROFILE.socials.linkedin.url} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><IconLinkedIn /></a>
          <a href={`mailto:${profile?.email ?? PROFILE.email}`} aria-label="Email"><IconMail /></a>
          {WHATSAPP_CONFIGURED && WHATSAPP_HREF && (
            <a href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><IconWhatsApp /></a>
          )}
        </div>

        <Button size="sm" onClick={onViewResume}>View résumé</Button>

        <div className="footer-meta">
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}