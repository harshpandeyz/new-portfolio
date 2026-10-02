/**
 * Homepage + recruiter curation — explicit source of truth.
 *
 * Do NOT derive signature projects from array order or from a generic
 * `.filter(featured).slice(0, 4)`. Database ordering, featured flags and
 * future content edits must never silently swap the homepage hierarchy.
 *
 * Hierarchy (intentional, product decision):
 *   FLAGSHIP (dominate):
 *     1. intelligent-surveillance-system (CCTV-X)
 *     2. orchestraai
 *   SELECTED (strong secondary stories):
 *     3. quantummind
 *     4. skillmatch
 *
 * Explicitly excluded from homepage signature slots (archive only):
 *   - intelligent-mob-surveillance-system (predecessor capstone, separate
 *     project — must never inherit CCTV-X screenshots/architecture)
 *   - brainmatch-game (iOS experiment, archive only)
 */

export const FLAGSHIP_SLUGS = [
  "intelligent-surveillance-system",
  "orchestraai",
] as const;

export const SELECTED_SLUGS = ["quantummind", "skillmatch"] as const;

export const SIGNATURE_SLUGS = [
  ...FLAGSHIP_SLUGS,
  ...SELECTED_SLUGS,
] as const;

export type SignatureSlug = (typeof SIGNATURE_SLUGS)[number];

/** Slugs that must never occupy a homepage signature slot. */
export const ARCHIVE_ONLY_SLUGS = [
  "intelligent-mob-surveillance-system",
  "brainmatch-game",
] as const;

export interface CuratableProject {
  id: string;
  slug: string;
  status?: string | null;
}

export interface HomepageCuration<T extends CuratableProject> {
  flagship: T[];
  selected: T[];
  signature: T[];
  archive: T[];
}

function isLive<T extends CuratableProject>(p: T): boolean {
  return (p.status ?? "complete") !== "draft";
}

/**
 * Resolve the homepage hierarchy from a raw project list.
 * Lookup is by slug (Map), curation order is fixed, drafts are excluded,
 * and archive-only slugs can never leak into flagship/selected.
 */
export function resolveHomepageCuration<T extends CuratableProject>(
  projects: readonly T[],
): HomepageCuration<T> {
  const bySlug = new Map(projects.filter(isLive).map((p) => [p.slug, p]));

  const flagship: T[] = [];
  for (const slug of FLAGSHIP_SLUGS) {
    const p = bySlug.get(slug);
    if (p) flagship.push(p);
  }

  const selected: T[] = [];
  for (const slug of SELECTED_SLUGS) {
    const p = bySlug.get(slug);
    // Defensive: never duplicate a flagship entry in the secondary row,
    // even if the curation constants are mis-edited in future.
    if (p && !flagship.some((f) => f.id === p.id)) selected.push(p);
  }

  const signature = [...flagship, ...selected];
  const signatureIds = new Set(signature.map((p) => p.id));
  const archive = projects
    .filter(isLive)
    .filter((p) => !signatureIds.has(p.id))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  return { flagship, selected, signature, archive };
}

/** Recruiter briefing uses the same intentional hierarchy. */
export function resolveRecruiterProjects<T extends CuratableProject>(
  projects: readonly T[],
): T[] {
  return resolveHomepageCuration(projects).signature;
}

export function isSignatureSlug(slug: string): slug is SignatureSlug {
  return (SIGNATURE_SLUGS as readonly string[]).includes(slug);
}

export function isArchiveOnlySlug(slug: string): boolean {
  return (ARCHIVE_ONLY_SLUGS as readonly string[]).includes(slug);
}

/** Resolve skill evidence by stored project slug, preserving the entered order. */
export function resolveSkillProjects<T extends CuratableProject>(
  skill: { usedInProjectSlugs?: readonly string[] },
  projects: readonly T[],
): T[] {
  const bySlug = new Map(projects.map((project) => [project.slug, project]));
  return (skill.usedInProjectSlugs ?? [])
    .map((slug) => bySlug.get(slug))
    .filter((project): project is T => project !== undefined);
}
