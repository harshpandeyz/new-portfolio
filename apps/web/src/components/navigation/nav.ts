/**
 * Shared section ids + section↔3D mode mapping for the home page.
 *
 * Resolved final IA (V3): Hero → About → Education/Journey → Projects →
 * Tech Stack → Credentials → Contact. About sits immediately after Hero and
 * the former "capabilities" skill wall is now the multi-domain Tech Stack.
 */
export const SECTION_IDS = ["hero", "about", "journey", "work", "tech", "credentials", "contact", "exit"] as const;

export type SectionId = (typeof SECTION_IDS)[number];

/** Top-level navigation items (primary actions only). */
export const NAV_LINKS: { label: string; id: SectionId }[] = [
  { label: "Work", id: "work" },
  { label: "About", id: "about" },
  { label: "Education", id: "journey" },
  { label: "Tech", id: "tech" },
  { label: "Credentials", id: "credentials" },
  { label: "Contact", id: "contact" },
];