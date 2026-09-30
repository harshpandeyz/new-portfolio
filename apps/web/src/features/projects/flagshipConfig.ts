import type { Project } from "@hp/shared";
import { FLAGSHIP_SLUGS, SELECTED_SLUGS, SIGNATURE_SLUGS } from "@hp/shared";

/**
 * Single source of truth for the flagship (CCTV-X) visual presentation.
 * Homepage consumes hero + compact flow + facts.
 * Case study consumes hero + full intentional gallery + full flow + facts.
 *
 * Homepage curation itself lives in packages/shared/src/curation.ts and is
 * consumed via resolveHomepageCuration() — never via array order or a
 * generic featured.slice(). This file only owns CCTV-X *visuals*.
 *
 * Do NOT duplicate this in FlagshipProject.tsx / ProjectCase.tsx.
 */

// CCTV-X is the evolved flagship repository. The older
// intelligent-mob-surveillance-system remains in the archive as a separate
// project and must never inherit CCTV-X's screenshots or architecture claims.
// All visual helpers below branch on exact slug equality for this reason.
export const FLAGSHIP_SLUG = FLAGSHIP_SLUGS[0] as string;
export { FLAGSHIP_SLUGS, SELECTED_SLUGS, SIGNATURE_SLUGS };

export interface GalleryImage {
  src: string;
  alt: string;
  caption: string;
  role: string;
  kicker: string;
}

export const FLAGSHIP_GALLERY: GalleryImage[] = [
  {
    src: "/projects/cctv-x/overview.png",
    alt: "CCTV-X Security Ops — Overview dashboard with sources online, active alerts, alert feed with fight and mob detections, and evidence records",
    caption: "Overview — operating picture",
    role: "OPERATIONS",
    kicker: "Overview",
  },
  {
    src: "/projects/cctv-x/analytics.png",
    alt: "Analytics — persisted crowd snapshots, global risk index and risk-over-time chart",
    caption: "Analytics — measured history",
    role: "MEASURED HISTORY",
    kicker: "Analytics",
  },
  {
    src: "/projects/cctv-x/zones.png",
    alt: "Detection zones — polygon editor for occupancy calibration and zone thresholds",
    caption: "Detection zones — spatial config",
    role: "SPATIAL CONFIGURATION",
    kicker: "Detection zones",
  },
  {
    src: "/projects/cctv-x/vault.png",
    alt: "Evidence vault — sealed artifacts with hash-ledger commitment, custody trail and Bitcoin attestation status",
    caption: "Evidence vault — chain of custody",
    role: "CHAIN OF CUSTODY",
    kicker: "Evidence vault",
  },
];

export const FLAGSHIP_HERO = FLAGSHIP_GALLERY[0] as GalleryImage;

/** Intentional case-study composition: overview full, analytics+zones row, vault full */
export const CASE_GALLERY_LAYOUT: {
  row: "full" | "pair";
  images: GalleryImage[];
}[] = [
  { row: "full", images: [FLAGSHIP_GALLERY[0]!] },
  { row: "pair", images: [FLAGSHIP_GALLERY[1]!, FLAGSHIP_GALLERY[2]!] },
  { row: "full", images: [FLAGSHIP_GALLERY[3]!] },
];

export interface FlowStage {
  icon: string;
  label: string;
  sub: string;
}

export function flagshipFlow(project: Project): FlowStage[] {
  if (project.slug === FLAGSHIP_SLUG) {
    return [
      { icon: "camera", label: "Capture", sub: "RTSP · webcam · upload" },
      { icon: "brain", label: "Detect", sub: "YOLOv8n · tracking" },
      { icon: "alert", label: "Event", sub: "escalation ladder" },
      { icon: "evidence", label: "Seal", sub: "AES-GCM · SHA-256" },
      { icon: "ledger", label: "Ledger", sub: "append-only hashes" },
      { icon: "attest", label: "Attest", sub: "OpenTimestamps · Bitcoin" },
    ];
  }
  if (project.slug === "orchestraai") {
    return [
      { icon: "user", label: "Task", sub: "user input" },
      { icon: "brain", label: "Context", sub: "build context" },
      { icon: "api", label: "Route", sub: "model routing" },
      { icon: "api", label: "Provider", sub: "OpenRouter/OpenAI" },
      { icon: "brain", label: "Tools", sub: "tool execution" },
      { icon: "ledger", label: "Memory", sub: "cache/telemetry" },
      { icon: "chat", label: "SSE", sub: "stream output" },
      { icon: "brain", label: "Re-evaluate", sub: "complete" },
    ];
  }
  if (project.dataFlow.length > 0) {
    return project.dataFlow.slice(0, 6).map((s, i) => ({
      icon: ["camera", "brain", "alert", "evidence", "ledger", "attest"][i] ?? "alert",
      label: s.split("→")[0]?.trim().slice(0, 14) ?? `Step ${i + 1}`,
      sub: s.split("→")[1]?.trim().slice(0, 22) ?? s.slice(0, 22),
    }));
  }
  return [];
}

export function caseFlowStages(project: Project): { label: string; sub: string; hint: string }[] {
  if (project.slug === FLAGSHIP_SLUG) {
    return [
      { label: "Capture", sub: "RTSP · webcam · upload", hint: "input" },
      { label: "Detect", sub: "YOLOv8n · tracking", hint: "ai" },
      { label: "Classify", sub: "possible → confirmed", hint: "event" },
      { label: "Seal", sub: "AES-GCM · SHA-256", hint: "evidence" },
      { label: "Ledger", sub: "append-only hash chain", hint: "ledger" },
      { label: "Attest", sub: "OpenTimestamps · Bitcoin", hint: "attest" },
    ];
  }
  if (project.slug === "orchestraai") {
    return [
      { label: "Task", sub: "user task", hint: "input" },
      { label: "Context", sub: "build context", hint: "context" },
      { label: "Route", sub: "model routing", hint: "ai" },
      { label: "Provider", sub: "OpenRouter/OpenAI/Anthropic", hint: "provider" },
      { label: "Tools", sub: "tool execution", hint: "tools" },
      { label: "Memory", sub: "cache/telemetry", hint: "memory" },
      { label: "SSE", sub: "stream output", hint: "stream" },
      { label: "Re-evaluate", sub: "complete", hint: "complete" },
    ];
  }
  return project.dataFlow.slice(0, 6).map((s) => {
    const [a, b] = s.split("→");
    return { label: (a ?? s).trim().slice(0, 18), sub: (b ?? "").trim().slice(0, 24) || "stage", hint: "flow" };
  });
}

export function flagshipFacts(project: Project): { k: string; v: string }[] {
  if (project.slug === FLAGSHIP_SLUG) {
    return [
      { k: "Role", v: "Full-stack · AI pipeline · evidence chain" },
      { k: "Stack", v: project.stack.slice(0, 5).join(" · ") || "—" },
      { k: "AI", v: "YOLOv8n · OpenCV · tracking" },
      { k: "Store", v: "MongoDB · AES-GCM · SHA-256" },
      { k: "Deploy", v: "Docker Compose · Caddy · HTTPS" },
    ];
  }
  return [
    { k: "Role", v: project.category || "Build" },
    { k: "Stack", v: project.stack.slice(0, 5).join(" · ") || "—" },
    { k: "Year", v: project.year || "—" },
    { k: "Status", v: project.status || "—" },
  ];
}

// ── Secondary visuals ─────────────────────────────────────
// Verified from seed data; no fabricated metrics.
// Each secondary project gets a compact 5-node pipeline that reads in seconds.

export interface SecondaryStage {
  label: string;
  sub: string;
  icon: string;
}

export const SECONDARY_VISUALS: Record<string, SecondaryStage[]> = {
  quantummind: [
    { label: "Documents", sub: "PDFs", icon: "documents" },
    { label: "Ingest", sub: "chunk · embed", icon: "ingest" },
    { label: "Vector", sub: "FAISS · search", icon: "search" },
    { label: "RAG", sub: "grounded LLM", icon: "brain" },
    { label: "Answer", sub: "SSE stream", icon: "chat" },
  ],
  skillmatch: [
    { label: "User", sub: "skills", icon: "user" },
    { label: "Role", sub: "target", icon: "auth" },
    { label: "Score", sub: "match", icon: "brain" },
    { label: "Path", sub: "learning", icon: "api" },
    { label: "Admin", sub: "CRUD", icon: "web" },
  ],
  studentlink: [
    { label: "User", sub: "sign-up", icon: "user" },
    { label: "Auth", sub: "JWT · Security", icon: "auth" },
    { label: "API", sub: "Spring Boot", icon: "api" },
    { label: "Social", sub: "graph · feed", icon: "social" },
    { label: "App", sub: "web · Railway", icon: "web" },
  ],
};

export function secondaryVisual(slug: string): SecondaryStage[] | null {
  return SECONDARY_VISUALS[slug] ?? null;
}

// ── Compact homepage facts (fewer, tighter) ────────────────
export function flagshipCompactFacts(project: Project): { k: string; v: string }[] {
  if (project.slug === FLAGSHIP_SLUG) {
    return [
      { k: "AI", v: "YOLOv8 + OpenCV" },
      { k: "Backend", v: "FastAPI" },
      { k: "Data", v: "MongoDB" },
      { k: "Security", v: "AES-256 · SHA-256" },
      { k: "Attestation", v: "OpenTimestamps · Bitcoin" },
    ];
  }
  if (project.slug === "orchestraai") {
    return [
      { k: "Runtime", v: "Node.js / TypeScript" },
      { k: "Store", v: "PostgreSQL" },
      { k: "Cache", v: "Redis" },
      { k: "Deploy", v: "Docker" },
      { k: "Stream", v: "SSE" },
    ];
  }
  const stack = project.stack.slice(0, 3).join(" · ");
  return [
    { k: "Stack", v: stack || "—" },
    { k: "Year", v: project.year || "—" },
    { k: "Status", v: project.status || "—" },
  ];
}

// ── Detailed visual system map for case study ──────────────
// Each node carries icon + title + detail to communicate in seconds.

export interface SystemMapNode {
  icon: string;
  title: string;
  detail: string;
}

export function systemMap(project: Project): SystemMapNode[] {
  if (project.slug === FLAGSHIP_SLUG) {
    return [
      { icon: "camera", title: "Capture", detail: "CCTV feed" },
      { icon: "brain", title: "Detect", detail: "YOLOv8 + OpenCV" },
      { icon: "alert", title: "Event", detail: "mob detection" },
      { icon: "evidence", title: "Seal", detail: "AES-256 · SHA-256" },
      { icon: "shield", title: "Integrity", detail: "hashing" },
      { icon: "ledger", title: "Ledger", detail: "append-only hash chain" },
      { icon: "attest", title: "Attest", detail: "OpenTimestamps · Bitcoin" },
    ];
  }
  if (project.slug === "orchestraai") {
    return [
      { icon: "user", title: "Task", detail: "user task" },
      { icon: "brain", title: "Context", detail: "build context" },
      { icon: "api", title: "Routing", detail: "model router" },
      { icon: "api", title: "Provider", detail: "OpenRouter/OpenAI" },
      { icon: "brain", title: "Tools", detail: "tool execution" },
      { icon: "ledger", title: "Memory", detail: "cache/telemetry" },
      { icon: "chat", title: "SSE", detail: "stream output" },
      { icon: "brain", title: "Re-evaluate", detail: "complete" },
    ];
  }
  if (project.slug === "quantummind") {
    return [
      { icon: "documents", title: "Upload", detail: "PDF · chunk" },
      { icon: "ingest", title: "Embed", detail: "sentence-transformers" },
      { icon: "search", title: "Retrieve", detail: "FAISS · top-k" },
      { icon: "brain", title: "Generate", detail: "Groq · OpenAI" },
      { icon: "chat", title: "Stream", detail: "SSE · chat" },
    ];
  }
  if (project.slug === "studentlink") {
    return [
      { icon: "user", title: "User", detail: "registration" },
      { icon: "auth", title: "Auth", detail: "JWT · Security" },
      { icon: "api", title: "API", detail: "Spring Boot" },
      { icon: "social", title: "Social", detail: "feed · graph" },
      { icon: "web", title: "Deploy", detail: "MySQL · Railway" },
    ];
  }
  if (project.dataFlow.length > 0) {
    return project.dataFlow.slice(0, 6).map((s, i) => {
      const [a, b] = s.split("→");
      return {
        icon: ["camera", "brain", "alert", "evidence", "ledger", "attest"][i] ?? "alert",
        title: (a ?? s).trim().slice(0, 14) || `Step ${i + 1}`,
        detail: (b ?? "").trim().slice(0, 22) || "stage",
      };
    });
  }
  return [];
}
