import type { Prisma } from "@prisma/client";

import { HttpError } from "../../utils/http.js";

type ContentClient = Pick<Prisma.TransactionClient, "project" | "certificate" | "profile">;
type MediaClient = Pick<Prisma.TransactionClient, "mediaAsset">;

/** Serializes media deletion/replacement with writes to content reference fields. */
export async function lockMediaReferenceChanges(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(6139, 15042026)`;
}

export async function getAssetReferences(db: ContentClient, asset: { url: string; storedName: string }) {
  const [projects, certificates, profile] = await Promise.all([
    db.project.findMany({ select: { title: true, slug: true, heroImage: true, gallery: true } }),
    db.certificate.findMany({ select: { title: true, fileUrl: true, credentialUrl: true } }),
    db.profile.findFirst({ select: { name: true, avatarUrl: true, resumeUrl: true } }),
  ]);

  const references: { kind: "project" | "certificate" | "profile"; label: string }[] = [];
  const matches = (reference: string | null | undefined) => Boolean(reference && referenceMatchesAsset(reference, asset));
  for (const project of projects) {
    if ([project.heroImage, ...project.gallery].some(matches)) {
      references.push({ kind: "project", label: project.title || project.slug });
    }
  }
  for (const certificate of certificates) {
    if ([certificate.fileUrl, certificate.credentialUrl].some(matches)) {
      references.push({ kind: "certificate", label: certificate.title });
    }
  }
  if ([profile?.avatarUrl, profile?.resumeUrl].some(matches)) {
    references.push({ kind: "profile", label: profile?.name ?? "Profile" });
  }
  return references;
}

export function referenceMatchesAsset(reference: string, asset: { url: string; storedName: string }): boolean {
  const clean = reference.split(/[?#]/, 1)[0] ?? reference;
  const assetUrl = asset.url.split(/[?#]/, 1)[0] ?? asset.url;
  return clean === assetUrl || clean.endsWith(`/${asset.storedName}`);
}

/** Reject new references to managed media that has already been removed. */
export async function validateManagedMediaReferences(db: MediaClient, references: (string | null | undefined)[]): Promise<void> {
  const names = [...new Set(references.map(managedMediaName).filter((name): name is string => name !== null))];
  if (names.length === 0) return;
  const existing = await db.mediaAsset.findMany({ where: { storedName: { in: names } }, select: { storedName: true } });
  const known = new Set(existing.map((asset) => asset.storedName));
  const missing = names.filter((name) => !known.has(name));
  if (missing.length > 0) {
    throw new HttpError(409, "MEDIA_NOT_FOUND", "A managed media asset was removed. Choose an available asset before saving.");
  }
}

function managedMediaName(reference: string | null | undefined): string | null {
  if (!reference) return null;
  let pathname: string;
  try {
    pathname = new URL(reference, "https://portfolio.invalid").pathname;
  } catch {
    return null;
  }
  const match = pathname.match(/(?:^|\/)static\/media\/([^/]+)$/);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
