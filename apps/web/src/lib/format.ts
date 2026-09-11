const SPECIAL_CASES: Record<string, string> = {
  ai: "AI",
  ml: "ML",
  ios: "iOS",
  "ci-cd": "CI/CD",
  devops: "DevOps",
  mlops: "MLOps",
  api: "API",
  css: "CSS",
  js: "JS",
  ts: "TS",
  react: "React",
  nextjs: "Next.js",
  postgres: "Postgres",
  postgresql: "PostgreSQL",
  mongodb: "MongoDB",
  graphql: "GraphQL",
  rest: "REST",
  ui: "UI",
  ux: "UX",
};

/** Turns database taxonomy labels into calm, readable public copy. */
export function formatTaxonomy(value: string): string {
  return value
    .split(/\s*[/_]\s*/)
    .filter(Boolean)
    .map((part) => {
      const normalized = part.trim().toLowerCase();
      const whole = SPECIAL_CASES[normalized];
      if (whole) return whole;
      // Title-case each word, preserving hyphenated compounds (Full-Stack).
      return part
        .trim()
        .split(/\s+/)
        .map((word) =>
          word
            .split("-")
            .map((seg) => {
              const lower = seg.toLowerCase();
              return SPECIAL_CASES[lower] ?? (seg ? seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase() : seg);
            })
            .join("-"),
        )
        .join(" ");
    })
    .join(" · ");
}
