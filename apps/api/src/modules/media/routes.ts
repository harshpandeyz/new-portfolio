import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { pipeline } from "node:stream/promises";

import type { FastifyInstance } from "fastify";

import { config } from "../../config.js";
import { prisma } from "../../db/prisma.js";
import { requireCsrf } from "../auth/routes.js";
import { requirePermission } from "../auth/rbac.js";
import { audit, clientIp, HttpError, noStore } from "../../utils/http.js";
import { rateLimit } from "../../utils/rate-limit.js";

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
  const isAvif = head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70;
  const isMp4 = head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70;
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

export async function mediaRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/",
    {
      preHandler: [requireMediaWrite, requireCsrf],
    },
    async (req, reply) => {
      const ip = clientIp(req);
      const limit = rateLimit(`media:${ip}`, 20, 10 * 60 * 1000);
      if (!limit.allowed) {
        reply.header("retry-after", limit.retryAfterSeconds);
        throw new HttpError(429, "RATE_LIMITED", "Too many uploads. Try again later.");
      }
      const file = await req.file();
      if (!file) throw new HttpError(400, "NO_FILE", "Multipart file field is required");

      if (!ALLOWED_MIME.has(file.mimetype)) {
        throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", `File type ${file.mimetype} is not allowed`);
      }
      // Extension must agree with the declared MIME (blocks extension spoofing).
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

      // Stream to disk while capturing the head for signature verification.
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
      await pipeline(file.file, sniffer, createWriteStream(dest));
      const head = Buffer.concat(chunks);

      const stat = await import("node:fs/promises").then((fs) => fs.stat(dest));
      const sizeBytes = stat.size;

      if (sizeBytes > config.maxUploadMb * 1024 * 1024) {
        await unlink(dest).catch(() => undefined);
        throw new HttpError(413, "PAYLOAD_TOO_LARGE", `File exceeds the ${config.maxUploadMb}MB limit`);
      }
      if (sizeBytes === 0) {
        await unlink(dest).catch(() => undefined);
        throw new HttpError(400, "EMPTY_FILE", "Uploaded file is empty");
      }
      if (!sniffMime(head, file.mimetype)) {
        await unlink(dest).catch(() => undefined);
        throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "File content does not match its declared type");
      }

      const url = `/static/media/${storedName}`;
      const asset = await prisma.mediaAsset.create({
        data: {
          filename: sanitizeFilename(file.filename),
          storedName,
          url,
          mimeType: file.mimetype,
          sizeBytes,
          kind: file.mimetype.startsWith("image/") ? "image" : file.mimetype === "application/pdf" ? "document" : "video",
          title: (file.fields.title as { value?: string } | undefined)?.value?.toString().slice(0, 160) ?? null,
        },
      });

      await audit(req, "MEDIA_UPLOADED", "media", asset.id, { filename: asset.filename, sizeBytes });
      reply.code(201);
      return { asset };
    },
  );

  app.get("/", { preHandler: [requireMediaRead] }, async (_req, reply) => {
    noStore(reply);
    const assets = await prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    return { assets };
  });

  app.delete("/:id", { preHandler: [requireMediaWrite, requireCsrf] }, async (req) => {
    const ip = clientIp(req);
    const limit = rateLimit(`media-del:${ip}`, 30, 10 * 60 * 1000);
    if (!limit.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many deletions. Try again later.");
    const { id } = req.params as { id: string };
    if (!/^[a-z0-9_-]{5,64}$/i.test(id)) throw new HttpError(400, "BAD_REQUEST", "Invalid asset id");
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new HttpError(404, "NOT_FOUND", "Asset not found");
    await unlink(resolveSafe(path.join(config.uploadDir, "media"), asset.storedName)).catch(() => undefined);
    await prisma.mediaAsset.delete({ where: { id } });
    await audit(req, "MEDIA_DELETED", "media", id, { filename: asset.filename });
    return { ok: true };
  });
}
