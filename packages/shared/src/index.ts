/**
 * @hp/shared — domain types shared between the public site, the admin
 * control center and the API. Single source of truth for the data model.
 */

export * from "./schemas.js";

export type ProjectTier = "featured" | "secondary" | "experiment" | "academic" | "legacy" | "internship";
export type ProjectStatus = "active" | "complete" | "maintained" | "archived" | "draft";
export type SkillLevel = "core" | "working" | "exploring" | "experimental";
export type SkillCategory =
  | "LANGUAGES"
  | "FRONTEND"
  | "BACKEND"
  | "DATABASES"
  | "AI_ML"
  | "CLOUD_DEVOPS"
  | "SECURITY"
  | "MOBILE"
  | "BLOCKCHAIN"
  | "EXPERIMENTAL";
export type CertificateCategory =
  | "AI"
  | "BACKEND"
  | "CLOUD"
  | "DATABASE"
  | "DEVELOPMENT"
  | "SECURITY"
  | "DATA"
  | "OTHER";
export type TimelineType = "education" | "project" | "certification" | "experience" | "competition" | "milestone";
export type MessageStatus = "NEW" | "READ" | "REPLIED" | "ARCHIVED";

export interface SocialLink {
  id?: string;
  label: string;
  url: string;
  handle?: string | null;
  order: number;
}

export interface Profile {
  id: string;
  name: string;
  headline: string;
  subHeadline: string;
  bio: string;
  location: string;
  email: string;
  availability: string;
  avatarUrl: string | null;
  resumeUrl: string | null;
  resumeLabel: string | null;
  socials: SocialLink[];
  updatedAt: string;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  codename: string | null;
  shortDescription: string;
  longDescription: string | null;
  category: string;
  tier: ProjectTier;
  status: ProjectStatus;
  featured: boolean;
  year: string;
  order: number;
  problem: string | null;
  solution: string | null;
  architecture: string | null;
  decisions: string[];
  challenges: string | null;
  results: string | null;
  securityNotes: string | null;
  dataFlow: string[];
  stack: string[];
  githubUrl: string | null;
  liveUrl: string | null;
  heroImage: string | null;
  gallery: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Certificate {
  id: string;
  title: string;
  issuer: string;
  issuedOn: string | null;
  category: CertificateCategory;
  credentialId: string | null;
  credentialUrl: string | null;
  fileUrl: string | null;
  description: string | null;
  featured: boolean;
  order: number;
  createdAt: string;
}

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  description: string | null;
  usedIn: string[];
  relatedConcepts: string[];
  featured: boolean;
  order: number;
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  field: string | null;
  startYear: string;
  endYear: string | null;
  grade: string | null;
  description: string | null;
  order: number;
}

export interface TimelineItem {
  id: string;
  date: string;
  endDate: string | null;
  title: string;
  organization: string | null;
  description: string | null;
  type: TimelineType;
  order: number;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: MessageStatus;
  ip: string | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}

export interface SystemStats {
  projects: number;
  featuredProjects: number;
  certificates: number;
  skills: number;
  timelineItems: number;
  chatQueries: number;
  contactMessages: number;
  unreadMessages: number;
  pageViews: number;
}

export interface ChatSource {
  kind: "PROJECT" | "SKILL" | "CERTIFICATE" | "PROFILE" | "TIMELINE" | "EDUCATION" | "RESUME";
  label: string;
  ref?: string;
}

export type ChatConfidence = "VERIFIED" | "INFERRED" | "UNKNOWN";

export interface ChatReply {
  answer: string;
  confidence: ChatConfidence;
  sources: ChatSource[];
  links: { label: string; href: string }[];
  provider: string;
}

export interface GithubOverview {
  login: string;
  name: string | null;
  bio: string | null;
  publicRepos: number;
  followers: number;
  htmlUrl: string;
  topRepositories: { name: string; description: string | null; language: string | null; stars: number; url: string; pushedAt: string }[];
  fetchedAt: string;
  stale: boolean;
}

export interface MediaAsset {
  id: string;
  filename: string;
  storedName: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  kind: string;
  title: string | null;
  createdAt: string;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "boot", title: "SYSTEM INITIALIZED", description: "Completed the boot sequence." },
  { id: "explorer", title: "PROJECT EXPLORER", description: "Opened a project case study." },
  { id: "archivist", title: "CERTIFICATE ARCHIVIST", description: "Inspected a credential in the archive." },
  { id: "deepdive", title: "DEEP DIVE", description: "Read a project's engineering architecture." },
  { id: "ai", title: "AI INTERACTION", description: "Questioned the system intelligence." },
  { id: "signal", title: "SIGNAL SENT", description: "Transmitted a message through the contact interface." },
  { id: "operator", title: "OPERATOR DISCOVERED", description: "Found the local operator access point." },
];
