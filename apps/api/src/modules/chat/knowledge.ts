import { prisma } from "../../db/prisma.js";

export interface KnowledgeDoc {
  id: string;
  kind: "PROJECT" | "SKILL" | "CERTIFICATE" | "PROFILE" | "TIMELINE" | "EDUCATION" | "RESUME";
  title: string;
  ref: string | null;
  content: string;
  keywords: string[];
}

let cache: { docs: KnowledgeDoc[]; builtAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#./ -]/g, " ")
    .split(/[\s/-]+/)
    .filter((t) => t.length > 1);
}

/** Builds (and caches) the retrieval corpus from every content table. */
export async function buildKnowledge(): Promise<KnowledgeDoc[]> {
  if (cache && Date.now() - cache.builtAt < CACHE_TTL_MS) return cache.docs;

  const [profile, projects, skills, certificates, education, timeline] = await Promise.all([
    prisma.profile.findFirst({ include: { socials: true } }),
    prisma.project.findMany({ where: { status: { not: "draft" } } }),
    prisma.skill.findMany(),
    prisma.certificate.findMany(),
    prisma.education.findMany(),
    prisma.timelineItem.findMany(),
  ]);

  const docs: KnowledgeDoc[] = [];

  if (profile) {
    docs.push({
      id: "profile",
      kind: "PROFILE",
      title: `${profile.name} — profile`,
      ref: null,
      content: [
        `${profile.name}. ${profile.headline} — ${profile.subHeadline}.`,
        profile.bio,
        `Location: ${profile.location}. Email: ${profile.email}. Availability: ${profile.availability}.`,
        profile.headline,
        profile.subHeadline,
      ].join(" "),
      keywords: tokenize(`${profile.name} who is harsh about bio summary profile contact email location pune`),
    });
  }

  for (const p of projects) {
    const content = [
      p.title + (p.codename ? ` (${p.codename})` : ""),
      p.shortDescription,
      p.longDescription ?? "",
      `Category: ${p.category}. Tier: ${p.tier}. Status: ${p.status}. Year: ${p.year}.`,
      `Tech stack: ${p.stack.join(", ")}.`,
      p.problem ? `Problem: ${p.problem}` : "",
      p.solution ? `Solution: ${p.solution}` : "",
      p.architecture ? `Architecture: ${p.architecture}` : "",
      p.results ? `Results: ${p.results}` : "",
      p.securityNotes ? `Security: ${p.securityNotes}` : "",
      p.githubUrl ? `Source: ${p.githubUrl}` : "",
      p.liveUrl ? `Live: ${p.liveUrl}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    docs.push({
      id: `project:${p.slug}`,
      kind: "PROJECT",
      title: p.title,
      ref: p.slug,
      content,
      keywords: tokenize(`${p.title} ${p.codename ?? ""} ${p.category} ${p.stack.join(" ")} ${p.shortDescription}`),
    });
  }

  const byCategory = new Map<string, string[]>();
  for (const s of skills) {
    docs.push({
      id: `skill:${s.id}`,
      kind: "SKILL",
      title: s.name,
      ref: s.name.toLowerCase(),
      content: `${s.name} — category ${s.category}, level ${s.level}. ${s.description ?? ""} Used in: ${s.usedIn.join(", ")}. Related: ${s.relatedConcepts.join(", ")}.`,
      keywords: tokenize(`${s.name} ${s.category} ${s.usedIn.join(" ")} ${s.relatedConcepts.join(" ")} skill technology know`),
    });
    const list = byCategory.get(s.category) ?? [];
    list.push(`${s.name} (${s.level})`);
    byCategory.set(s.category, list);
  }
  // one aggregate doc per category so "what technologies" retrieves a summary
  for (const [category, names] of byCategory) {
    docs.push({
      id: `skills:${category}`,
      kind: "SKILL",
      title: `${category.replace(/_/g, " / ")} capabilities`,
      ref: null,
      content: `Skill categories include ${category.replace(/_/g, " ").toLowerCase()}: ${names.join(", ")}.`,
      keywords: tokenize(`technologies stack skills tools ${category} ${names.join(" ")}`),
    });
  }

  const certSample = certificates.slice(0, 200);
  if (certSample.length > 0) {
    const grouped = new Map<string, string[]>();
    for (const c of certSample) {
      const list = grouped.get(c.issuer) ?? [];
      list.push(c.title);
      grouped.set(c.issuer, list);
    }
    for (const c of certSample) {
      docs.push({
        id: `certificate:${c.id}`,
        kind: "CERTIFICATE",
        title: c.title,
        ref: c.title,
        content: `Certificate: ${c.title}, issued by ${c.issuer}${c.issuedOn ? ` on ${c.issuedOn}` : ""}. Category: ${c.category}.${c.credentialId ? ` Credential ID: ${c.credentialId}.` : ""}`,
        keywords: tokenize(`${c.title} ${c.issuer} certificate credential ${c.category}`),
      });
    }
    docs.push({
      id: "certificates:summary",
      kind: "CERTIFICATE",
      title: `Certificate archive (${certSample.length} credentials)`,
      ref: null,
      content: `Harsh holds ${certSample.length} verified credentials. Issuers include: ${[...grouped.keys()].join(", ")}. Notable: MongoDB Java Developer Path (MongoDB University), Backend Development and API Creation (Coursera), Node.js & MongoDB (Coursera/IBM), Software Engineering & Agile (Infosys Springboard), Cloud Technologies (Infosys Springboard), Networking Basics (Cisco Networking Academy), AMCAT certified.`,
      keywords: tokenize("certificates credentials certifications issuer archive verified"),
    });
  }

  for (const e of education) {
    docs.push({
      id: `education:${e.id}`,
      kind: "EDUCATION",
      title: `${e.degree} — ${e.institution}`,
      ref: null,
      content: `${e.degree}${e.field ? ` (${e.field})` : ""} at ${e.institution}, ${e.startYear}–${e.endYear ?? "present"}.${e.grade ? ` Grade: ${e.grade}.` : ""} ${e.description ?? ""}`,
      keywords: tokenize(`education degree university college study studied ${e.degree} ${e.institution} btech mit adt`),
    });
  }

  for (const t of timeline) {
    docs.push({
      id: `timeline:${t.id}`,
      kind: "TIMELINE",
      title: `${t.date} — ${t.title}`,
      ref: null,
      content: `${t.date}: ${t.title}${t.organization ? ` — ${t.organization}` : ""}. ${t.description ?? ""} Type: ${t.type}.`,
      keywords: tokenize(`${t.title} ${t.organization ?? ""} ${t.type} ${t.date} timeline milestone internship hackathon award`),
    });
  }

  cache = { docs, builtAt: Date.now() };
  return docs;
}

/** Called after admin mutations so the corpus refreshes immediately. */
export function invalidateKnowledge(): void {
  cache = null;
}
