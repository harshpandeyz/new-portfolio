import type { Project } from "@hp/shared";

/**
 * Single source of truth for the flagship (CCTV-X) visual presentation.
 * Homepage consumes hero + compact flow + facts.
 * Case study consumes hero + full intentional gallery + full flow + facts.
 *
 * Do NOT duplicate this in FlagshipProject.tsx / ProjectCase.tsx.
 */

export const FLAGSHIP_SLUG = "intelligent-surveillance-system";

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
      { icon: "camera", label: "Input", sub: "RTSP · webcam · upload" },
      { icon: "brain", label: "Detect", sub: "YOLOv8n · tracking" },
      { icon: "alert", label: "Event", sub: "fight · mob · surge" },
      { icon: "evidence", label: "Evidence", sub: "clip · AES-GCM · SHA-256" },
      { icon: "ledger", label: "Ledger", sub: "hash chain · custody" },
      { icon: "attest", label: "Attest", sub: "OpenTimestamps · bundle" },
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
      { label: "Detect", sub: "YOLOv8n · centroid / IoU", hint: "ai" },
      { label: "Classify", sub: "fight · mob · surge", hint: "event" },
      { label: "Seal", sub: "clip · AES-GCM · SHA-256", hint: "evidence" },
      { label: "Chain", sub: "append-only hash ledger", hint: "ledger" },
      { label: "Anchor", sub: "OpenTimestamps → bundle", hint: "attest" },
    ];
  }
  return project.dataFlow.slice(0, 6).map((s) => {
    const [a, b] = s.split("→");
    return { label: (a ?? s).trim().slice(0, 18), sub: (b ?? "").trim().slice(0, 24) || "stage", hint: "flow" };
  });
}

export function flagshipFacts(project: Project): { k: string; v: string }[] {
  return [
    { k: "Role", v: "Full-stack · AI pipeline · evidence chain" },
    { k: "Stack", v: project.stack.slice(0, 5).join(" · ") },
    { k: "AI", v: "YOLOv8n · OpenCV · tracking" },
    { k: "Store", v: "MongoDB · AES-GCM · SHA-256" },
    { k: "Deploy", v: "Docker Compose · Caddy · HTTPS" },
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
  return [
    { k: "AI", v: "YOLOv8n" },
    { k: "Backend", v: "FastAPI" },
    { k: "Data", v: "MongoDB" },
    { k: "Security", v: "AES-GCM · SHA-256" },
    { k: "Deploy", v: "Docker · Caddy" },
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
      { icon: "camera", title: "Input", detail: "RTSP · webcam · upload" },
      { icon: "brain", title: "YOLOv8n", detail: "detection · tracking" },
      { icon: "alert", title: "Event", detail: "fight · mob · surge" },
      { icon: "evidence", title: "Evidence", detail: "clip · metadata" },
      { icon: "shield", title: "Integrity", detail: "AES-GCM · SHA-256" },
      { icon: "ledger", title: "Ledger", detail: "hash chain · custody" },
      { icon: "attest", title: "Attest", detail: "OpenTimestamps" },
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
