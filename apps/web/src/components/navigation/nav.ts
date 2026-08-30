/** Shared section ids + section↔3D mode mapping for the home page. */
export const SECTION_IDS = ["hero", "work", "about", "capabilities", "journey", "credentials", "contact", "exit"] as const;

export type SectionId = (typeof SECTION_IDS)[number];

/** Top-level navigation items (primary actions only). */
export const NAV_LINKS: { label: string; id: SectionId }[] = [
  { label: "Work", id: "work" },
  { label: "About", id: "about" },
  { label: "Journey", id: "journey" },
  { label: "Credentials", id: "credentials" },
  { label: "Contact", id: "contact" },
];

export const CORE_MODE_BY_INDEX: ("hero" | "projects" | "core" | "credentials" | "contact" | "hero")[] = [
  "hero", "projects", "core", "core", "hero", "credentials", "contact", "contact",
];
