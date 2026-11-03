/**
 * Shared section ids for the home page.
 *
 * Resolved IA: Hero → Featured Projects → About → Technical Expertise →
 * Education → Credentials → Open Source → Contact. Featured work leads
 * because it is the strongest proof; the open-source record closes the
 * loop before contact.
 */
export const SECTION_IDS = ["hero", "work", "about", "tech", "journey", "credentials", "opensource", "contact"] as const;

export type SectionId = (typeof SECTION_IDS)[number];

/** Top-level navigation items (primary actions only). */
export const NAV_LINKS: { label: string; id: SectionId }[] = [
  { label: "Work", id: "work" },
  { label: "About", id: "about" },
  { label: "Education", id: "journey" },
  { label: "Tech", id: "tech" },
  { label: "Credentials", id: "credentials" },
  { label: "Open Source", id: "opensource" },
  { label: "Contact", id: "contact" },
];
