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
  const social = (label: string) => profile?.socials.find((s) => s.label.toLowerCase() === label.toLowerCase())?.url;

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-identity">
          <strong>Harsh Pandey</strong>
          <span>Software Engineer · Backend · Applied AI</span>
        </div>

        <nav className="footer-nav" aria-label="Footer">
          <a href="/#work">Work</a>
          <a href="/#about">About</a>
          <a href="/#journey">Education</a>
          <a href="/#tech">Tech</a>
          <a href="/#credentials">Credentials</a>
          <a href="/#contact">Contact</a>
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