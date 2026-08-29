const SPECIAL_CASES: Record<string, string> = {
  ai: "AI",
  ml: "ML",
  ios: "iOS",
  "ci-cd": "CI/CD",
  devops: "DevOps",
  mlops: "MLOps",
  api: "API",
};

/** Turns database taxonomy labels into calm, readable public copy. */
export function formatTaxonomy(value: string): string {
  return value
    .split(/\s*[\/_]\s*/)
    .filter(Boolean)
    .map((part) => {
      const normalized = part.trim().toLowerCase();
      return SPECIAL_CASES[normalized] ?? normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
    })
    .join(" · ");
}
