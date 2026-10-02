import { createWriteStream } from "node:fs";
import { copyFile, mkdir, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { pipeline } from "node:stream/promises";

import type { FastifyInstance } from "fastify";
import type { MultipartFile } from "@fastify/multipart";

import { config } from "../../config.js";
import { prisma } from "../../db/prisma.js";
import { requireCsrf } from "../auth/routes.js";
import { requirePermission } from "../auth/rbac.js";
import { audit, clientIp, HttpError, noStore } from "../../utils/http.js";
import { rateLimit } from "../../utils/rate-limit.js";
import { getAssetReferences, lockMediaReferenceChanges, referenceMatchesAsset } from "./references.js";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "application/pdf",
  "video/mp4",
  "video/webm",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

const requireMediaRead = requirePermission("media:read");
const requireMediaWrite = requirePermission("media:write");
const VERSION_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

async function removeFileBestEffort(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("[media] file cleanup failed", error instanceof Error ? error.name : "unknown error");
    }
  }
}

async function pruneExpiredVersions(): Promise<void> {
  try {
    const expired = await prisma.mediaAssetVersion.findMany({
      where: { deleteAfter: { lte: new Date() } },
      select: { id: true, storedName: true },
    });
    if (!expired.length) return;
    await prisma.mediaAssetVersion.deleteMany({ where: { id: { in: expired.map((row) => row.id) } } });
    await Promise.all(expired.map((row) => removeFileBestEffort(resolveSafe(path.join(config.uploadDir, "media"), row.storedName))));
  } catch (error) {
    console.warn("[media] version retention cleanup failed", error instanceof Error ? error.name : "unknown error");
  }
}

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^[._-]+/, "")
    .slice(0, 120);
}

/** Minimal magic-byte verification — never trust browser-supplied MIME alone. */
function sniffMime(head: Buffer, declared: string): boolean {
  if (head.length < 12) return false;
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const isPng =
    head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47 && head[4] === 0x0d && head[5] === 0x0a;
  const isGif = head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46;
  const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46;
  const isWebp = head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;
  const hasFtyp = head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70;
  const brand = head.subarray(8, 12).toString("ascii");
  const isAvif = hasFtyp && (brand === "avif" || brand === "avis");
  const isMp4 = hasFtyp && !isAvif && ["isom", "iso2", "mp41", "mp42", "avc1", "M4V ", "dash", "MSNV"].includes(brand);
  const isWebm = head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3;

  switch (declared) {
    case "image/jpeg":
      return isJpeg;
    case "image/png":
      return isPng;
    case "image/gif":
      return isGif;
    case "application/pdf":
      return isPdf;
    case "image/webp":
      return isWebp;
    case "image/avif":
      return isAvif;
    case "video/mp4":
      return isMp4;
    case "video/webm":
      return isWebm;
    default:
      return false;
  }
}

function resolveSafe(base: string, name: string): string {
  const resolved = path.resolve(base, name);
  if (!resolved.startsWith(path.resolve(base) + path.sep)) {
    throw new HttpError(400, "BAD_PATH", "Invalid storage path");
  }
  return resolved;
}

type MediaKind = "image" | "document" | "video";

interface StoredUpload {
  filename: string;
  storedName: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  kind: MediaKind;
  title: string | null;
}

async function storeIncomingFile(file: MultipartFile): Promise<StoredUpload> {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", `File type ${file.mimetype} is not allowed`);
  }
  const originalExt = (file.filename.split(".").pop() ?? "").toLowerCase();
  const expectedExt = EXT_BY_MIME[file.mimetype];
  const extAllows = new Set([expectedExt, ...(expectedExt === "jpg" ? ["jpeg"] : [])]);
  if (originalExt && !extAllows.has(originalExt)) {
    throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "File extension does not match file type");
  }

  const ext = EXT_BY_MIME[file.mimetype] ?? "bin";
  const safeOriginal = sanitizeFilename(file.filename.replace(/\.[^.]*$/, ""));
  const storedName = `${Date.now()}-${randomBytes(8).toString("hex")}-${safeOriginal || "asset"}.${ext}`;
  const kindDir = path.join(config.uploadDir, "media");
  await mkdir(kindDir, { recursive: true });
  const dest = resolveSafe(kindDir, storedName);
  const chunks: Buffer[] = [];
  let headLen = 0;
  const { Transform } = await import("node:stream");
  const sniffer = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      if (headLen < 16) {
        const need = 16 - headLen;
        chunks.push(chunk.subarray(0, need));
        headLen += Math.min(need, chunk.length);
      }
      cb(null, chunk);
    },
  });

  let committed = false;
  try {
    await pipeline(file.file, sniffer, createWriteStream(dest));
    const stat = await import("node:fs/promises").then((fs) => fs.stat(dest));
    const sizeBytes = stat.size;
    const head = Buffer.concat(chunks);
    if (sizeBytes > config.maxUploadMb * 1024 * 1024) {
      throw new HttpError(413, "PAYLOAD_TOO_LARGE", `File exceeds the ${config.maxUploadMb}MB limit`);
    }
    if (sizeBytes === 0) throw new HttpError(400, "EMPTY_FILE", "Uploaded file is empty");
    if (!sniffMime(head, file.mimetype)) {
      throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "File content does not match its declared type");
    }

    committed = true;
    return {
      filename: sanitizeFilename(file.filename),
      storedName,
      url: `/static/media/${storedName}`,
      mimeType: file.mimetype,
      sizeBytes,
      kind: file.mimetype.startsWith("image/") ? "image" : file.mimetype === "application/pdf" ? "document" : "video",
      title: (file.fields.title as { value?: string } | undefined)?.value?.toString().replace(/[\r\n]+/g, " ").slice(0, 160) ?? null,
    };
  } finally {
    if (!committed) await removeFileBestEffort(dest);
  }
}

export async function mediaRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/",
    {
      preHandler: [requireMediaWrite, requireCsrf],
    },
    async (req, reply) => {
      const ip = clientIp(req);
      const limit = await rateLimit(`media:${ip}`, 20, 10 * 60 * 1000);
      if (!limit.allowed) {
        reply.header("retry-after", limit.retryAfterSeconds);
        throw new HttpError(429, "RATE_LIMITED", "Too many uploads. Try again later.");
      }
      const file = await req.file();
      if (!file) throw new HttpError(400, "NO_FILE", "Multipart file field is required");
      const stored = await storeIncomingFile(file);
      const asset = await prisma.mediaAsset.create({ data: stored });
      await audit(req, "MEDIA_UPLOADED", "media", asset.id, { filename: asset.filename, sizeBytes: asset.sizeBytes });
      reply.code(201);
      return { asset: { ...asset, referenced: false } };
    },
  );

  app.post("/:id/replace", { preHandler: [requireMediaWrite, requireCsrf] }, async (req, reply) => {
    const ip = clientIp(req);
    const limit = await rateLimit(`media:${ip}`, 20, 10 * 60 * 1000);
    if (!limit.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many uploads. Try again later.");
    const { id } = req.params as { id: string };
    if (!/^[a-z0-9_-]{5,64}$/i.test(id)) throw new HttpError(400, "BAD_REQUEST", "Invalid asset id");
    const file = await req.file();
    if (!file) throw new HttpError(400, "NO_FILE", "Multipart file field is required");

    const stored = await storeIncomingFile(file);
    const mediaDir = path.join(config.uploadDir, "media");
    const incomingPath = resolveSafe(mediaDir, stored.storedName);
    let finalIncomingPath = false;
    let oldStoredName: string | null = null;
    let overwrittenStoredName: string | null = null;
    let versionStoredName: string | null = null;
    let referenced = false;
    let asset: Awaited<ReturnType<typeof prisma.mediaAsset.update>>;
    try {
      asset = await prisma.$transaction(async (tx) => {
        await lockMediaReferenceChanges(tx);
        const existing = await tx.mediaAsset.findUnique({ where: { id } });
        if (!existing) throw new HttpError(404, "NOT_FOUND", "Asset not found");
        const references = await getAssetReferences(tx, existing);
        referenced = references.length > 0;
        if (stored.mimeType !== existing.mimeType && referenced) {
          throw new HttpError(409, "ASSET_REFERENCED", "A referenced asset can only be replaced with the same file type. Update its references first.", { references });
        }

        const extension = path.extname(existing.storedName) || `.${EXT_BY_MIME[existing.mimeType] ?? "bin"}`;
        versionStoredName = `history-${randomBytes(16).toString("hex")}${extension}`;
        const versionPath = resolveSafe(mediaDir, versionStoredName);
        await copyFile(resolveSafe(mediaDir, existing.storedName), versionPath);
        await tx.mediaAssetVersion.create({
          data: {
            assetId: existing.id,
            filename: existing.filename,
            storedName: versionStoredName,
            url: `/static/media/${versionStoredName}`,
            mimeType: existing.mimeType,
            sizeBytes: existing.sizeBytes,
            kind: existing.kind,
            title: existing.title,
            deleteAfter: new Date(Date.now() + VERSION_RETENTION_MS),
          },
        });

        if (stored.mimeType === existing.mimeType) {
          // Preserve existing content URLs; the old bytes remain available as a version.
          overwrittenStoredName = existing.storedName;
          await rename(incomingPath, resolveSafe(mediaDir, existing.storedName));
          return tx.mediaAsset.update({
            where: { id },
            data: { filename: stored.filename, sizeBytes: stored.sizeBytes, kind: stored.kind, title: stored.title },
          });
        }

        oldStoredName = existing.storedName;
        await rename(incomingPath, resolveSafe(mediaDir, stored.storedName));
        finalIncomingPath = true;
        return tx.mediaAsset.update({ where: { id }, data: stored });
      });
    } catch (error) {
      if (overwrittenStoredName && versionStoredName) {
        try {
          await copyFile(resolveSafe(mediaDir, versionStoredName), resolveSafe(mediaDir, overwrittenStoredName));
        } catch (restoreError) {
          console.error("[media] failed to restore the previous asset after a replacement error", restoreError instanceof Error ? restoreError.name : "unknown error");
        }
      }
      await removeFileBestEffort(finalIncomingPath ? resolveSafe(mediaDir, stored.storedName) : incomingPath);
      if (versionStoredName) await removeFileBestEffort(resolveSafe(mediaDir, versionStoredName));
      throw error;
    }

    if (oldStoredName) await removeFileBestEffort(resolveSafe(mediaDir, oldStoredName));
    await pruneExpiredVersions();
    await audit(req, "MEDIA_REPLACED", "media", id, { filename: asset.filename, sizeBytes: asset.sizeBytes });
    reply.code(200);
    return { asset: { ...asset, referenced } };
  });

  app.get("/", { preHandler: [requireMediaRead] }, async (_req, reply) => {
    noStore(reply);
    await pruneExpiredVersions();
    const [assets, referenceRows] = await Promise.all([
      prisma.mediaAsset.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { versions: { where: { deleteAfter: { gt: new Date() } }, orderBy: { createdAt: "desc" }, take: 10 } },
      }),
      Promise.all([
        prisma.project.findMany({ select: { title: true, slug: true, heroImage: true, gallery: true } }),
        prisma.certificate.findMany({ select: { title: true, fileUrl: true, credentialUrl: true } }),
        prisma.profile.findFirst({ select: { name: true, avatarUrl: true, resumeUrl: true } }),
      ]),
    ]);
    const [projects, certificates, profile] = referenceRows;
    const referenceUrls: string[] = [
      ...projects.flatMap((project) => [project.heroImage, ...project.gallery]),
      ...certificates.flatMap((certificate) => [certificate.fileUrl, certificate.credentialUrl]),
      profile?.avatarUrl,
      profile?.resumeUrl,
    ].filter((value): value is string => Boolean(value));
    return {
      assets: assets.map((asset) => ({
        ...asset,
        referenced: referenceUrls.some((reference) => referenceMatchesAsset(reference, asset)),
      })),
    };
  });

  app.delete("/:id", { preHandler: [requireMediaWrite, requireCsrf] }, async (req) => {
    const ip = clientIp(req);
    const limit = await rateLimit(`media-del:${ip}`, 30, 10 * 60 * 1000);
    if (!limit.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many deletions. Try again later.");
    const { id } = req.params as { id: string };
    if (!/^[a-z0-9_-]{5,64}$/i.test(id)) throw new HttpError(400, "BAD_REQUEST", "Invalid asset id");
    const asset = await prisma.$transaction(async (tx) => {
      await lockMediaReferenceChanges(tx);
      const current = await tx.mediaAsset.findUnique({ where: { id } });
      if (!current) throw new HttpError(404, "NOT_FOUND", "Asset not found");
      const references = await getAssetReferences(tx, current);
      if (references.length > 0) {
        throw new HttpError(409, "ASSET_REFERENCED", "This asset is still used by published content. Remove or update those references before deleting it.", { references });
      }
      await tx.mediaAsset.delete({ where: { id } });
      return current;
    });
    await removeFileBestEffort(resolveSafe(path.join(config.uploadDir, "media"), asset.storedName));
    await audit(req, "MEDIA_DELETED", "media", id, { filename: asset.filename });
    return { ok: true };
  });
}
