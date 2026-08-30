/**
 * App-level profile configuration.
 *
 * These are intentionally centralized so a single edit updates every surface
 * (resume viewer, contact panel, navigation, SEO, recruiter page) without
 * scattering values across components. Values that come from the database
 * (profile.socials, profile.email, profile.resumeUrl) still win at runtime;
 * these constants are the verified fallbacks and the places where a value is
 * not yet present in the data model.
 *
 * IMPORTANT (content policy): only verified personal information is used.
 * Anything unknown stays configurable or omitted — never invented.
 */

export const PROFILE = {
  name: "Harsh Pandey",
  headline: "Software Engineer",
  positioning: "Backend systems · Applied AI · Full Stack",
  location: "Pune, India",
  /** Verified public email (also present in seeded profile + JSON-LD). */
  email: "harshap17058@gmail.com",
  availability: "Open to opportunities",
  resume: {
    /** Resolve against the origin the web assets are served from. */
    path: "/files/HARSH-RESUME.pdf",
    label: "Résumé",
  },
  /** Public handle (seed stores the same values in social_links). */
  socials: {
    github: {
      url: "https://github.com/harshpandeyz",
      handle: "@harshpandeyz",
    },
    linkedin: {
      url: "https://www.linkedin.com/in/harshpandeyz/",
      handle: "/in/harshpandeyz",
    },
  },
  /**
   * WhatsApp contact — intended to be configured per deployment.
   *
   * Set a verified international number (E.164, no "+") via env at build time,
   * e.g. VITE_WHATSAPP=9198XXXXXXXX. When empty, the WhatsApp channel renders
   * as a mailto fallback so the primary action still works.
   */
  whatsappNumber: import.meta.env.VITE_WHATSAPP as string | undefined,
  whatsappMessage:
    import.meta.env.VITE_WHATSAPP_MESSAGE ??
    "Hi Harsh, I came across your portfolio and would like to talk.",
} as const;

/** Contact channels order & labels — mirrors the premium contact panel. */
export const CONTACT_CHANNELS = [
  { key: "whatsapp", label: "WhatsApp", detail: "Message directly", action: "Message directly" },
  { key: "email", label: "Email", detail: "Send an email", action: "Send an email" },
  { key: "linkedin", label: "LinkedIn", detail: "Connect", action: "Connect" },
  { key: "github", label: "GitHub", detail: "View code", action: "View code" },
] as const;

export type ContactChannelKey = (typeof CONTACT_CHANNELS)[number]["key"];

/**
 * WhatsApp deep link, available only when a verified number is configured at
 * build time (`VITE_WHATSAPP`, E.164 without "+"). When unset the WhatsApp
 * channel is hidden entirely rather than mislabelled as a mailto link — the
 * email channel remains the primary fallback for direct contact.
 */
export const WHATSAPP_HREF = PROFILE.whatsappNumber
  ? `https://wa.me/${PROFILE.whatsappNumber}?text=${encodeURIComponent(PROFILE.whatsappMessage)}`
  : null;

export const WHATSAPP_CONFIGURED = PROFILE.whatsappNumber != null && PROFILE.whatsappNumber !== "";

export const SEO = {
  siteUrl: "https://harshporfolio.netlify.app",
  title: "Harsh Pandey — Software Engineer | Backend · AI · Full Stack",
  description:
    "Harsh Pandey is a software engineer in Pune, India building backend systems, applied AI products and thoughtful full-stack experiences. Explore selected work, capabilities, credentials and an AI assistant.",
};
