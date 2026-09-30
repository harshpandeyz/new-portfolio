import { describe, expect, it } from "vitest";

import {
  ARCHIVE_ONLY_SLUGS,
  FLAGSHIP_SLUGS,
  SELECTED_SLUGS,
  SIGNATURE_SLUGS,
  resolveHomepageCuration,
  resolveRecruiterProjects,
} from "@hp/shared";

function proj(slug: string, order = 0, status = "complete") {
  return { id: `id-${slug}`, slug, status, order };
}

describe("homepage curation — explicit source of truth", () => {
  it("defines the exact flagship + selected hierarchy", () => {
    expect([...FLAGSHIP_SLUGS]).toEqual([
      "intelligent-surveillance-system",
      "orchestraai",
    ]);
    expect([...SELECTED_SLUGS]).toEqual(["quantummind", "skillmatch"]);
    expect([...SIGNATURE_SLUGS]).toEqual([
      "intelligent-surveillance-system",
      "orchestraai",
      "quantummind",
      "skillmatch",
    ]);
  });

  it("never promotes archive-only projects to signature slots", () => {
    expect([...ARCHIVE_ONLY_SLUGS]).toContain(
      "intelligent-mob-surveillance-system",
    );
    expect([...ARCHIVE_ONLY_SLUGS]).toContain("brainmatch-game");
    for (const slug of ARCHIVE_ONLY_SLUGS) {
      expect([...SIGNATURE_SLUGS]).not.toContain(slug);
    }
  });

  it("resolves by slug, ignoring array order and featured noise", () => {
    // Deliberately scrambled: archive-only first, signature last.
    const projects = [
      proj("intelligent-mob-surveillance-system", 0),
      proj("brainmatch-game", 1),
      proj("skillmatch", 99),
      proj("quantummind", 98),
      proj("orchestraai", 97),
      proj("intelligent-surveillance-system", 96),
    ];
    const { flagship, selected, signature, archive } =
      resolveHomepageCuration(projects);
    expect(flagship.map((p) => p.slug)).toEqual([
      "intelligent-surveillance-system",
      "orchestraai",
    ]);
    expect(selected.map((p) => p.slug)).toEqual([
      "quantummind",
      "skillmatch",
    ]);
    expect(signature.map((p) => p.slug)).toEqual([
      "intelligent-surveillance-system",
      "orchestraai",
      "quantummind",
      "skillmatch",
    ]);
    // Archive keeps everything else, never duplicates signature.
    expect(archive.map((p) => p.slug)).toContain(
      "intelligent-mob-surveillance-system",
    );
    expect(archive.map((p) => p.slug)).toContain("brainmatch-game");
    expect(
      archive.some((p) =>
        (SIGNATURE_SLUGS as readonly string[]).includes(p.slug),
      ),
    ).toBe(false);
  });

  it("excludes drafts from signature slots", () => {
    const projects = [
      proj("intelligent-surveillance-system", 1, "draft"),
      proj("orchestraai", 2),
      proj("quantummind", 3),
      proj("skillmatch", 4),
    ];
    const { flagship } = resolveHomepageCuration(projects);
    expect(flagship.map((p) => p.slug)).not.toContain(
      "intelligent-surveillance-system",
    );
    expect(flagship.map((p) => p.slug)).toEqual(["orchestraai"]);
  });

  it("recruiter uses the same intentional hierarchy", () => {
    const projects = [
      proj("brainmatch-game", 0),
      proj("intelligent-mob-surveillance-system", 1),
      proj("skillmatch", 5),
      proj("quantummind", 4),
      proj("orchestraai", 3),
      proj("intelligent-surveillance-system", 2),
    ];
    expect(resolveRecruiterProjects(projects).map((p) => p.slug)).toEqual([
      "intelligent-surveillance-system",
      "orchestraai",
      "quantummind",
      "skillmatch",
    ]);
  });
});
