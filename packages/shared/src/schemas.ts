import { z } from "zod";

/** ── Public contact ─────────────────────────────────────────── */
export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  subject: z.string().trim().max(140).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(4000),
  // honeypot — real users never see this field; bots fill it.
  // Not max(0)-validated here so the handler can silently accept (202) bot traffic.
  company: z.string().max(200).optional().or(z.literal("")),
});
export type ContactInput = z.infer<typeof contactSchema>;

/** ── Chat ───────────────────────────────────────────────────── */
export const chatSchema = z.object({
  message: z.string().trim().min(2).max(600),
});
export type ChatInput = z.infer<typeof chatSchema>;

/** ── Auth ───────────────────────────────────────────────────── */
export const loginSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** ── Admin CRUD payloads ────────────────────────────────────── */
export const tierValues = ["featured", "secondary", "experiment", "academic", "legacy", "internship"] as const;
export const projectStatusValues = ["active", "complete", "maintained", "archived", "draft"] as const;
export const skillLevelValues = ["core", "working", "exploring", "experimental"] as const;
export const skillCategoryValues = [
  "LANGUAGES", "FRONTEND", "BACKEND", "DATABASES", "AI_ML",
  "CLOUD_DEVOPS", "SECURITY", "MOBILE", "BLOCKCHAIN", "EXPERIMENTAL",
] as const;
export const certificateCategoryValues = [
  "AI", "BACKEND", "CLOUD", "DATABASE", "DEVELOPMENT", "SECURITY", "DATA", "OTHER",
] as const;
export const timelineTypeValues = [
  "education", "project", "certification", "experience", "competition", "milestone",
] as const;
export const messageStatusValues = ["NEW", "READ", "REPLIED", "ARCHIVED", "SPAM"] as const;

/** ── Security: password / 2FA / sessions ─────────────────────── */

export const strongPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(200)
  .refine((v) => /[a-z]/.test(v), "Include a lowercase letter")
  .refine((v) => /[A-Z]/.test(v), "Include an uppercase letter")
  .refine((v) => /\d/.test(v), "Include a number")
  .refine((v) => /[^a-zA-Z0-9]/.test(v), "Include a symbol");

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: strongPasswordSchema,
});

export const reauthSchema = z.object({
  password: z.string().min(1).max(200),
});

export const twoFactorVerifySchema = z.object({
  code: z.string().trim().min(6).max(32),
  /** Pending challenge issued by password step when 2FA is enabled. */
  challenge: z.string().min(10).max(500).optional(),
});

export const twoFactorSetupVerifySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const messageBulkStatusSchema = z.object({
  ids: z.array(z.string().min(1).max(64)).min(1).max(100),
  status: z.enum(messageStatusValues),
});

export const messageBulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1).max(64)).min(1).max(100),
});

export const contactQuerySchema = z.object({
  status: z.enum(["ALL", ...messageStatusValues]).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  q: z.string().trim().max(120).optional(),
  sort: z.enum(["newest", "oldest"]).optional(),
});

export const siteSettingsInputSchema = z.object({
  chatEnabled: z.boolean(),
  contactEnabled: z.boolean(),
  analyticsEnabled: z.boolean(),
  maintenanceMode: z.boolean(),
});

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().trim().max(160).optional(),
  action: z.string().trim().max(80).optional(),
  entity: z.string().trim().max(80).optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"),
});

const optionalText = z.string().trim().max(8000).optional().nullable();

/**
 * URLs are content, not trusted code. Admin-authored links are rendered in
 * public anchors and media elements, so reject executable and protocol-
 * relative values at the shared contract boundary.
 *
 * Site-relative paths are supported for assets owned by the web/API apps;
 * external links may use HTTPS (and mailto/tel for contact channels).
 */
function isSafePublicUrl(value: string): boolean {
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    const parsed = new URL(value);
    return ["https:", "mailto:", "tel:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

const urlish = z
  .string()
  .trim()
  .max(500)
  .refine(isSafePublicUrl, "Use a site-relative path or an HTTPS/mailto/tel URL")
  .optional()
  .nullable();

const galleryUrl = z
  .string()
  .trim()
  .max(500)
  .refine(isSafePublicUrl, "Use a site-relative path or an HTTPS URL");

export const projectQuerySchema = z.object({
  tier: z.enum(tierValues).optional(),
  featured: z.enum(["true", "false"]).optional(),
});

export const certificateQuerySchema = z.object({
  category: z.enum(["ALL", ...certificateCategoryValues]).optional(),
  search: z.string().trim().max(120).optional(),
  year: z.string().regex(/^\d{4}$/).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});

export const skillQuerySchema = z.object({
  category: z.enum(["ALL", ...skillCategoryValues]).optional(),
});

export const timelineQuerySchema = z.object({
  type: z.enum(["ALL", ...timelineTypeValues]).optional(),
});

export const projectInputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case"),
  codename: optionalText,
  shortDescription: z.string().trim().min(2).max(400),
  longDescription: optionalText,
  category: z.string().trim().min(2).max(80),
  tier: z.enum(tierValues),
  status: z.enum(projectStatusValues),
  featured: z.boolean(),
  year: z.string().trim().max(20),
  order: z.number().int().min(0).max(9999),
  problem: optionalText,
  solution: optionalText,
  architecture: optionalText,
  decisions: z.array(z.string().trim().max(600)).max(24).optional(),
  challenges: optionalText,
  results: optionalText,
  securityNotes: optionalText,
  dataFlow: z.array(z.string().trim().max(600)).max(24).optional(),
  stack: z.array(z.string().trim().min(1).max(60)).max(40),
  githubUrl: urlish,
  liveUrl: urlish,
  heroImage: urlish,
  gallery: z.array(galleryUrl).max(24).optional(),
});
export type ProjectInput = z.infer<typeof projectInputSchema>;

export const certificateInputSchema = z.object({
  title: z.string().trim().min(2).max(200),
  issuer: z.string().trim().min(2).max(160),
  issuedOn: z.string().trim().max(20).optional().nullable(),
  category: z.enum(certificateCategoryValues),
  credentialId: z.string().trim().max(120).optional().nullable(),
  credentialUrl: urlish,
  fileUrl: urlish,
  description: optionalText,
  featured: z.boolean(),
  order: z.number().int().min(0).max(9999),
});
export type CertificateInput = z.infer<typeof certificateInputSchema>;

export const skillInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  category: z.enum(skillCategoryValues),
  level: z.enum(skillLevelValues),
  description: optionalText,
  usedIn: z.array(z.string().trim().max(120)).max(24).optional(),
  relatedConcepts: z.array(z.string().trim().max(80)).max(24).optional(),
  featured: z.boolean(),
  order: z.number().int().min(0).max(9999),
});
export type SkillInput = z.infer<typeof skillInputSchema>;

export const timelineInputSchema = z.object({
  date: z.string().trim().min(4).max(20),
  endDate: z.string().trim().max(20).optional().nullable(),
  title: z.string().trim().min(2).max(160),
  organization: z.string().trim().max(160).optional().nullable(),
  description: optionalText,
  type: z.enum(timelineTypeValues),
  order: z.number().int().min(0).max(9999),
});
export type TimelineInput = z.infer<typeof timelineInputSchema>;

export const educationInputSchema = z.object({
  degree: z.string().trim().min(2).max(160),
  institution: z.string().trim().min(2).max(160),
  field: z.string().trim().max(160).optional().nullable(),
  startYear: z.string().trim().min(4).max(9),
  endYear: z.string().trim().max(9).optional().nullable(),
  grade: z.string().trim().max(40).optional().nullable(),
  description: optionalText,
  order: z.number().int().min(0).max(9999),
});
export type EducationInput = z.infer<typeof educationInputSchema>;

export const profileInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  headline: z.string().trim().min(2).max(160),
  subHeadline: z.string().trim().min(2).max(160),
  bio: z.string().trim().min(10).max(4000),
  location: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  availability: z.string().trim().max(160),
  avatarUrl: urlish,
  resumeUrl: urlish,
  resumeLabel: z.string().trim().max(120).optional().nullable(),
  socials: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(60),
        url: z.string().trim().min(4).max(500).refine(isSafePublicUrl, "Use a site-relative path or an HTTPS/mailto/tel URL"),
        handle: z.string().trim().max(120).optional().nullable(),
        order: z.number().int().min(0).max(999),
      }),
    )
    .max(12),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;

export const messageStatusSchema = z.object({
  status: z.enum(messageStatusValues),
});

/** ── Admin: reply to a contact message ──────────────────────── */
export const messageReplySchema = z.object({
  subject: z.string().trim().max(140).optional().or(z.literal("")),
  // Admin replies may be short acknowledgements ("Thanks!"); quality is the
  // operator's call, so only block empty/whitespace bodies.
  body: z.string().trim().min(2).max(4000),
});
export type MessageReplyInput = z.infer<typeof messageReplySchema>;

/** ── Admin: AI provider configuration ─────────────────────────
 * Secrets travel client→server on write only and are never returned.
 * List/detail responses expose hasKey + keyHint (masked suffix).
 */
export const aiProviderKindValues = ["openai", "openrouter", "nvidia", "groq", "custom"] as const;

const aiProviderBase = z.object({
  name: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9 _-]+$/, "Use letters, numbers, spaces, - or _"),
  kind: z.enum(aiProviderKindValues),
  baseUrl: z.string().trim().min(8).max(500).url("Use a full HTTPS URL"),
  model: z.string().trim().min(1).max(160),
  temperature: z.coerce.number().min(0).max(2).default(0.2),
  maxTokens: z.coerce.number().int().min(32).max(8000).default(500),
  timeoutMs: z.coerce.number().int().min(2000).max(120000).default(20000),
  systemPrompt: z.string().trim().max(8000).optional().nullable().or(z.literal("")),
  enabled: z.boolean().default(true),
  priority: z.coerce.number().int().min(0).max(999).default(0),
  isFallback: z.boolean().default(false),
});

export const aiProviderCreateSchema = aiProviderBase.extend({
  apiKey: z.string().trim().min(8).max(5000),
});
export type AiProviderCreateInput = z.infer<typeof aiProviderCreateSchema>;

export const aiProviderUpdateSchema = aiProviderBase.partial().extend({
  apiKey: z.string().trim().min(8).max(5000).optional().or(z.literal("")),
});
export type AiProviderUpdateInput = z.infer<typeof aiProviderUpdateSchema>;

export const interviewSchema = z.object({
  action: z.enum(["start", "answer", "end"]),
  answer: z.string().trim().max(4000).optional().or(z.literal("")),
  history: z
    .array(
      z.object({
        role: z.enum(["ai", "user"]),
        text: z.string().trim().max(4000),
      }),
    )
    .max(40)
    .optional()
    .default([]),
});
export type InterviewInput = z.infer<typeof interviewSchema>;
