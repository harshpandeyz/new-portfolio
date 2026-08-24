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
/** ── Chat ───────────────────────────────────────────────────── */
export const chatSchema = z.object({
    message: z.string().trim().min(2).max(600),
});
/** ── Auth ───────────────────────────────────────────────────── */
export const loginSchema = z.object({
    email: z.string().trim().email().max(160),
    password: z.string().min(8).max(200),
});
/** ── Admin CRUD payloads ────────────────────────────────────── */
export const tierValues = ["featured", "secondary", "experiment", "academic", "legacy", "internship"];
export const projectStatusValues = ["active", "complete", "maintained", "archived", "draft"];
export const skillLevelValues = ["core", "working", "exploring", "experimental"];
export const skillCategoryValues = [
    "LANGUAGES", "FRONTEND", "BACKEND", "DATABASES", "AI_ML",
    "CLOUD_DEVOPS", "SECURITY", "MOBILE", "BLOCKCHAIN", "EXPERIMENTAL",
];
export const certificateCategoryValues = [
    "AI", "BACKEND", "CLOUD", "DATABASE", "DEVELOPMENT", "SECURITY", "DATA", "OTHER",
];
export const timelineTypeValues = [
    "education", "project", "certification", "experience", "competition", "milestone",
];
export const messageStatusValues = ["NEW", "READ", "REPLIED", "ARCHIVED"];
const optionalText = z.string().trim().max(8000).optional().nullable();
const urlish = z.string().trim().max(500).optional().nullable();
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
    gallery: z.array(z.string().trim().max(500)).max(24).optional(),
});
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
export const timelineInputSchema = z.object({
    date: z.string().trim().min(4).max(20),
    endDate: z.string().trim().max(20).optional().nullable(),
    title: z.string().trim().min(2).max(160),
    organization: z.string().trim().max(160).optional().nullable(),
    description: optionalText,
    type: z.enum(timelineTypeValues),
    order: z.number().int().min(0).max(9999),
});
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
        .array(z.object({
        label: z.string().trim().min(1).max(60),
        url: z.string().trim().min(4).max(500),
        handle: z.string().trim().max(120).optional().nullable(),
        order: z.number().int().min(0).max(999),
    }))
        .max(12),
});
export const messageStatusSchema = z.object({
    status: z.enum(messageStatusValues),
});
//# sourceMappingURL=schemas.js.map