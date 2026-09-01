import type { ReactElement } from "react";

/**
 * TechGlyph — a small, consistent stroke-based icon set for the tech grid.
 * No icon library exists in this project's dependencies, so the glyphs are a
 * deliberate hand-rolled set: 16px viewBox, currentColor stroke, 1.5px weight.
 * Unknown names fall back to a first-letter monogram.
 */

function Atom() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <ellipse cx="8" cy="8" rx="6.4" ry="2.6" />
      <ellipse cx="8" cy="8" rx="6.4" ry="2.6" transform="rotate(60 8 8)" />
      <ellipse cx="8" cy="8" rx="6.4" ry="2.6" transform="rotate(-60 8 8)" />
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Code() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5.5 4.2 2 8l3.5 3.8M10.5 4.2 14 8l-3.5 3.8" />
    </svg>
  );
}

function Bolt() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8.8 1.5 3.5 9h3.2l-.7 5.5L11 7H7.6l1.2-5.5z" />
    </svg>
  );
}

function Database() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <ellipse cx="8" cy="4" rx="5.2" ry="2" />
      <path d="M2.8 4v8c0 1.1 2.3 2 5.2 2s5.2-.9 5.2-2V4" />
      <path d="M2.8 8c0 1.1 2.3 2 5.2 2s5.2-.9 5.2-2" />
    </svg>
  );
}

function Container() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2.5" y="4" width="11" height="3.4" rx="0.8" />
      <rect x="2.5" y="9" width="11" height="3.4" rx="0.8" />
    </svg>
  );
}

function Branch() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="4.5" cy="3.5" r="1.6" />
      <circle cx="4.5" cy="12.5" r="1.6" />
      <circle cx="11.5" cy="6" r="1.6" />
      <path d="M4.5 5.1v5.8M6.9 6h3C10.5 8.9 7.6 10.6 6.1 11.8" />
    </svg>
  );
}

function Shield() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.8 13 3.6v4.1C13 11.2 10.8 13.6 8 14.6 5.2 13.6 3 11.2 3 7.7V3.6L8 1.8z" />
      <path d="M6 8l1.4 1.4L10 6.6" />
    </svg>
  );
}

function Hex() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.4 13.4 4.7v6.6L8 14.6 2.6 11.3V4.7L8 1.4z" />
      <circle cx="8" cy="8" r="1.5" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M6.8 9.2 9.2 6.8M7.2 11.8l-1.6 1.6A2.6 2.6 0 0 1 2 9.8l1.6-1.6M8.8 4.2l1.6-1.6a2.6 2.6 0 0 1 3.6 3.6l-1.5 1.6" />
    </svg>
  );
}

function Brain() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 3.2c.9-1.1 2.6-1 3.4.2.9-.5 2.1-.1 2.4.8.9.3 1.3 1.3.9 2 .7.9.2 2.2-.9 2.3v.8" />
      <path d="M8 3.2c-.9-1.1-2.6-1-3.4.2-.9-.5-2.1-.1-2.4.8C1.3 4.5.9 5.5 1.3 6.2.6 7.1 1.1 8.4 2.2 8.5v1" />
      <path d="M8 3.2V6M3 8.7h4V11.4h4V9M5.5 11.4v1M10.5 11.4v1" />
    </svg>
  );
}

function Layers() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.6 14 5 8 8.4 2 5l6-3.4zM2 8l6 3.4L14 8M2 11l6 3.4L14 11" />
    </svg>
  );
}

function Phone() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="4.4" y="1.6" width="7.2" height="12.8" rx="1.6" />
      <path d="M6.8 12.4h2.4" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5 1.8 9 8l-4 6.2M9.5 1.8 13.5 8l-4 6.2" />
    </svg>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.2 8.4 5.6 11.8 13.8 3.4" />
    </svg>
  );
}

function Lock() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3.2" y="7.2" width="9.6" height="6.6" rx="1.2" />
      <path d="M5.4 7.2V5.4a2.6 2.6 0 0 1 5.2 0v1.8" />
    </svg>
  );
}

function Gauge() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.4 10.6a6.6 6.6 0 1 1 11.2 0" />
      <path d="M8 10.4 10.8 6.4" />
    </svg>
  );
}

export const GLYPHS: Record<string, () => ReactElement> = {
  react: Atom,
  code: Code,
  bolt: Bolt,
  database: Database,
  container: Container,
  branch: Branch,
  shield: Shield,
  hex: Hex,
  link: LinkIcon,
  brain: Brain,
  layers: Layers,
  phone: Phone,
  arrow: Arrow,
  check: Check,
  lock: Lock,
  gauge: Gauge,
};

const MATCHES: [RegExp, keyof typeof GLYPHS][] = [
  [/react/i, "react"],
  [/react native/i, "phone"],
  [/swift|ios|uikit/i, "code"],
  [/typescript|javascript|tsx/i, "code"],
  [/python|flask|fastapi/i, "bolt"],
  [/java|spring/i, "layers"],
  [/node|express|runtimes/i, "hex"],
  [/postgres|mysql|mongo|sql|database/i, "database"],
  [/docker|container|compose/i, "container"],
  [/git|github/i, "branch"],
  [/rest api/i, "link"],
  [/rbac|security|auth|networking/i, "lock"],
  [/mvc|architecture|scalab/i, "layers"],
  [/yolo|opencv|mediapipe|machine learning|llm|rag|mlops|pipeline/i, "brain"],
  [/vite|build|bundl/i, "bolt"],
  [/selenium|pytest|test|qa/i, "check"],
  [/postman|curl|http/i, "arrow"],
  [/solidity|blockchain|contract/i, "hex"],
  [/redis|cache|queue/i, "gauge"],
];

export function techGlyph(name: string): () => ReactElement {
  for (const [re, key] of MATCHES) {
    if (re.test(name)) {
      const glyph = GLYPHS[key];
      if (glyph) return glyph;
    }
  }
  return GLYPHS.code ?? Code;
}

/** First-letter monogram fallback for unknown stack names. */
export function TechMonogram({ name }: { name: string }) {
  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  return <span className="tech-mono" aria-hidden="true">{initial}</span>;
}

export function TechGlyph({ name }: { name: string }) {
  const Glyph = techGlyph(name);
  return <span className="tech-glyph" aria-hidden="true"><Glyph /></span>;
}