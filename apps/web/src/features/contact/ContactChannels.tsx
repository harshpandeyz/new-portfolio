import { useData } from "../../lib/data";
import { PROFILE, WHATSAPP_HREF, WHATSAPP_CONFIGURED } from "../../app/constants";
import { IconWhatsApp, IconMail, IconLinkedIn, IconGithub, IconArrowRight, IconDownload } from "../../components/ui/icons";

export interface ContactChannelsProps {
  onViewResume: () => void;
}

interface ChannelDef {
  key: string;
  label: string;
  detail: string;
  href?: string;
  external?: boolean;
  action?: "resume" | "link";
  icon: React.ReactNode;
}

/** Fast direct ways to reach Harsh — faster than filling the form. */
export function ContactChannels({ onViewResume }: ContactChannelsProps) {
  const { profile } = useData();

  const social = (label: string) => profile?.socials.find((s) => s.label.toLowerCase() === label.toLowerCase())?.url;

  // WhatsApp is only offered when a verified destination is configured; the
  // email channel is the always-available direct path.
  const channels: ChannelDef[] = [
    ...(WHATSAPP_CONFIGURED && WHATSAPP_HREF
      ? [{ key: "whatsapp", label: "WhatsApp", detail: "Message directly", href: WHATSAPP_HREF, external: true, icon: <IconWhatsApp /> }]
      : []),
    { key: "email", label: "Email", detail: "Send an email", href: `mailto:${profile?.email ?? PROFILE.email}`, icon: <IconMail /> },
    { key: "linkedin", label: "LinkedIn", detail: "Connect", href: social("linkedin") ?? PROFILE.socials.linkedin.url, external: true, icon: <IconLinkedIn /> },
    { key: "github", label: "GitHub", detail: "View code", href: social("github") ?? PROFILE.socials.github.url, external: true, icon: <IconGithub /> },
  ];

  return (
    <div className="contact-channels" data-reveal>
      <div className="eyebrow">Reach me directly</div>
      {channels.map((c) => (
        <a
          key={c.key}
          className="contact-channel"
          href={c.href}
          aria-label={`${c.label} — ${c.detail}`}
          {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          <span className="cc-icon" aria-hidden="true">{c.icon}</span>
          <span className="cc-text">
            <span className="cc-label">{c.label}</span>
            <span className="cc-detail">{c.detail}</span>
          </span>
          <span className="cc-arrow" aria-hidden="true"><IconArrowRight /></span>
        </a>
      ))}
      <button className="contact-channel" onClick={onViewResume} aria-label="View résumé — View / download">
        <span className="cc-icon" aria-hidden="true"><IconDownload /></span>
        <span className="cc-text">
          <span className="cc-label">Résumé</span>
          <span className="cc-detail">View / download</span>
        </span>
        <span className="cc-arrow" aria-hidden="true"><IconArrowRight /></span>
      </button>
      <p className="cc-availability">Typically replies within a day · {profile?.availability ?? "Open to opportunities"}</p>
    </div>
  );
}