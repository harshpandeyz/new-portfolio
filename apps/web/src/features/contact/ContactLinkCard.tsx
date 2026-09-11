import type { ReactNode } from "react";

import { IconArrowRight } from "../../components/ui/icons";

export type ContactVisualKind = "email" | "linkedin" | "github" | "resume";

export interface ContactLinkCardProps {
  title: string;
  label: string;
  /** Real destination/detail line (email address, domain handle, "PDF …"). */
  destination: string;
  /** Small contextual pill under the destination. */
  pill: string;
  icon: ReactNode;
  visual: ContactVisualKind;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  /** Accessible action description, e.g. "Email — Send me an email". */
  actionLabel: string;
}

/* Lightweight CSS/SVG micro-visuals. One shared blue + neutral palette for
   every card — geometry and motion differ, color never does. */

function EmailVisual() {
  return (
    <svg viewBox="0 0 124 76" aria-hidden="true">
      <path
        className="clc-draw"
        d="M6 62 C 26 58, 30 44, 18 40 C 8 37, 10 50, 30 48 C 62 45, 66 30, 96 22"
        fill="none"
        stroke="var(--color-accent)"
        strokeOpacity="0.35"
        strokeWidth="1.4"
        strokeDasharray="3 4"
        strokeLinecap="round"
      />
      <ellipse cx="30" cy="64" rx="9" ry="3.5" fill="none" stroke="var(--color-accent)" strokeOpacity="0.25" strokeWidth="1.2" />
      <g className="clc-plane">
        <path d="M44 46 L110 12 L92 62 L78 50 Z" fill="#c9defc" />
        <path d="M44 46 L110 12 L80 48 Z" fill="#e3eefe" />
        <path d="M78 50 L110 12 L86 60 Z" fill="#9dc0f5" />
        <path d="M78 50 L70 64 L74 51 Z" fill="#7aa9ef" />
      </g>
    </svg>
  );
}

function LinkedInVisual() {
  return (
    <svg viewBox="0 0 124 76" aria-hidden="true">
      <g stroke="var(--color-accent)" strokeOpacity="0.3" strokeWidth="1.2">
        <line x1="62" y1="26" x2="30" y2="50" />
        <line x1="62" y1="26" x2="94" y2="48" />
        <line x1="30" y1="50" x2="56" y2="58" />
        <line x1="94" y1="48" x2="60" y2="60" />
      </g>
      <g className="clc-node">
        <circle cx="62" cy="24" r="13" fill="#e3eefe" stroke="#b9d2f8" strokeWidth="1.2" />
        <circle cx="62" cy="21" r="3.4" fill="#2f7de9" />
        <path d="M55.5 30.5c1.2-3.4 11.8-3.4 13 0" fill="none" stroke="#2f7de9" strokeWidth="1.8" strokeLinecap="round" />
      </g>
      <g className="clc-node clc-node-b">
        <circle cx="28" cy="52" r="9" fill="#eef4fe" stroke="#c3d8fa" strokeWidth="1.2" />
        <circle cx="28" cy="50" r="2.4" fill="#5b95ec" />
        <path d="M23.5 57c.9-2.5 8.1-2.5 9 0" fill="none" stroke="#5b95ec" strokeWidth="1.4" strokeLinecap="round" />
      </g>
      <g className="clc-node clc-node-c">
        <circle cx="96" cy="50" r="9" fill="#eef4fe" stroke="#c3d8fa" strokeWidth="1.2" />
        <circle cx="96" cy="48" r="2.4" fill="#5b95ec" />
        <path d="M91.5 55c.9-2.5 8.1-2.5 9 0" fill="none" stroke="#5b95ec" strokeWidth="1.4" strokeLinecap="round" />
      </g>
      <circle className="clc-ping" cx="62" cy="24" r="13" fill="none" stroke="var(--color-accent)" strokeWidth="1.2" />
    </svg>
  );
}

function GitHubVisual() {
  return (
    <svg viewBox="0 0 124 76" aria-hidden="true">
      <g className="clc-codewin">
        <rect x="34" y="8" width="78" height="56" rx="8" fill="#eef4fe" stroke="#c3d8fa" strokeWidth="1.2" />
        <rect x="34" y="8" width="78" height="16" rx="8" fill="#dce9fd" />
        <rect x="34" y="16" width="78" height="8" fill="#dce9fd" />
        <circle cx="43" cy="16" r="2.2" fill="#9dc0f5" />
        <circle cx="50" cy="16" r="2.2" fill="#9dc0f5" />
        <circle cx="57" cy="16" r="2.2" fill="#9dc0f5" />
        <text x="46" y="46" fontFamily="ui-monospace, monospace" fontSize="13" fontWeight="700" fill="#2f7de9">&lt;/&gt;</text>
        <rect className="clc-codeline" x="68" y="33" width="32" height="4" rx="2" fill="#b9d2f8" />
        <rect className="clc-codeline" x="68" y="41" width="24" height="4" rx="2" fill="#c9defc" />
        <rect className="clc-codeline" x="68" y="49" width="28" height="4" rx="2" fill="#dce9fd" />
      </g>
      <rect x="14" y="22" width="30" height="42" rx="7" fill="#f4f8ff" stroke="#d5e4fc" strokeWidth="1.2" />
      <rect x="19" y="30" width="20" height="4" rx="2" fill="#c9defc" />
      <rect x="19" y="38" width="14" height="4" rx="2" fill="#dce9fd" />
      <rect x="19" y="46" width="17" height="4" rx="2" fill="#dce9fd" />
    </svg>
  );
}

function ResumeVisual() {
  return (
    <svg viewBox="0 0 124 76" aria-hidden="true">
      <g className="clc-sheet-back" transform="rotate(8 88 38)">
        <rect x="66" y="10" width="44" height="56" rx="6" fill="#dce9fd" stroke="#b9d2f8" strokeWidth="1.2" />
      </g>
      <g className="clc-sheet" transform="rotate(-6 52 38)">
        <rect x="28" y="8" width="48" height="60" rx="6" fill="#ffffff" stroke="#b9d2f8" strokeWidth="1.4" />
        <path d="M64 8l12 12h-12z" fill="#c9defc" />
        <rect x="36" y="20" width="24" height="4" rx="2" fill="#2f7de9" fillOpacity="0.75" />
        <rect className="clc-docline" x="36" y="29" width="32" height="3.4" rx="1.7" fill="#c9defc" />
        <rect className="clc-docline" x="36" y="36" width="32" height="3.4" rx="1.7" fill="#c9defc" />
        <rect className="clc-docline" x="36" y="43" width="24" height="3.4" rx="1.7" fill="#dce9fd" />
        <rect className="clc-docline" x="36" y="50" width="28" height="3.4" rx="1.7" fill="#dce9fd" />
      </g>
    </svg>
  );
}

function Visual({ kind }: { kind: ContactVisualKind }) {
  switch (kind) {
    case "email":
      return <EmailVisual />;
    case "linkedin":
      return <LinkedInVisual />;
    case "github":
      return <GitHubVisual />;
    case "resume":
      return <ResumeVisual />;
  }
}

/**
 * One reusable data-driven contact card. Renders as a link when `href` is
 * given, otherwise as a button (used by the résumé viewer action).
 */
export function ContactLinkCard({
  title,
  label,
  destination,
  pill,
  icon,
  visual,
  href,
  external,
  onClick,
  actionLabel,
}: ContactLinkCardProps) {
  const inner = (
    <>
      <span className="clc-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="clc-text">
        <span className="clc-title">{title}</span>
        <span className="clc-label">{label}</span>
        <span className="clc-dest">{destination}</span>
        <span className="clc-pill">{pill}</span>
      </span>
      <span className="clc-visual" aria-hidden="true">
        <Visual kind={visual} />
      </span>
      <span className="clc-arrow" aria-hidden="true">
        <IconArrowRight />
      </span>
    </>
  );

  if (href) {
    return (
      <a
        className="clc"
        href={href}
        aria-label={actionLabel}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {inner}
      </a>
    );
  }
  return (
    <button type="button" className="clc" onClick={onClick} aria-label={actionLabel}>
      {inner}
    </button>
  );
}
