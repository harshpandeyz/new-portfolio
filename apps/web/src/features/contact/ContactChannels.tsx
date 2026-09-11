import { useData } from "../../lib/data";
import { PROFILE } from "../../app/constants";
import { IconMail, IconLinkedIn, IconGithub, IconDownload } from "../../components/ui/icons";
import { ContactLinkCard, type ContactVisualKind } from "./ContactLinkCard";

export interface ContactChannelsProps {
  onViewResume: () => void;
}

interface CardDef {
  key: string;
  title: string;
  label: string;
  destination: string;
  pill: string;
  icon: React.ReactNode;
  visual: ContactVisualKind;
  href?: string;
  external?: boolean;
  action?: "resume";
}

/** Display form of a URL: host + path without protocol, www or trailing slash. */
function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.host.toLowerCase().replace(/^www\./i, "");
    const path = u.pathname.replace(/\/$/, "");
    return `${host}${path === "/" ? "" : path}`;
  } catch {
    return url
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split(/[?#]/)[0]!
      .replace(/\/$/, "");
  }
}

/** Direct contact channels — every destination is real data, never invented. */
export function ContactChannels({ onViewResume }: ContactChannelsProps) {
  const { profile } = useData();

  const email = profile?.email ?? PROFILE.email;
  const social = (label: string) => profile?.socials.find((s) => s.label.toLowerCase() === label.toLowerCase())?.url;
  const linkedinUrl = social("linkedin") ?? PROFILE.socials.linkedin.url;
  const githubUrl = social("github") ?? PROFILE.socials.github.url;

  const cards: CardDef[] = [
    {
      key: "email",
      title: "Email",
      label: "Send me an email",
      destination: email,
      pill: "Best for project inquiries",
      icon: <IconMail />,
      visual: "email",
      href: `mailto:${email}`,
    },
    {
      key: "linkedin",
      title: "LinkedIn",
      label: "Let's connect",
      destination: displayUrl(linkedinUrl),
      pill: "Professional network",
      icon: <IconLinkedIn />,
      visual: "linkedin",
      href: linkedinUrl,
      external: true,
    },
    {
      key: "github",
      title: "GitHub",
      label: "View my work",
      destination: displayUrl(githubUrl),
      pill: "Code, projects & experiments",
      icon: <IconGithub />,
      visual: "github",
      href: githubUrl,
      external: true,
    },
    {
      key: "resume",
      title: "Résumé",
      label: "View or download",
      destination: "PDF document",
      pill: "Experience & background",
      icon: <IconDownload />,
      visual: "resume",
      action: "resume",
    },
  ];

  return (
    <div className="contact-channels" data-reveal>
      {cards.map((c) =>
        c.action === "resume" ? (
          <ContactLinkCard
            key={c.key}
            title={c.title}
            label={c.label}
            destination={c.destination}
            pill={c.pill}
            icon={c.icon}
            visual={c.visual}
            onClick={onViewResume}
            actionLabel={`${c.title} — ${c.label}`}
          />
        ) : (
          <ContactLinkCard
            key={c.key}
            title={c.title}
            label={c.label}
            destination={c.destination}
            pill={c.pill}
            icon={c.icon}
            visual={c.visual}
            href={c.href}
            external={c.external}
            actionLabel={`${c.title} — ${c.label}`}
          />
        ),
      )}
      <div className="cc-availability">
        <span className="cc-dot" aria-hidden="true" />
        <p>
          <strong>Typically replies within a day</strong>
          <span>{profile?.availability ?? PROFILE.availability}</span>
        </p>
      </div>
    </div>
  );
}
