import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { pipeline } from "node:stream/promises";

import type { FastifyInstance } from "fastify";

import { config } from "../../config.js";
import { prisma } from "../../db/prisma.js";
import { requireAdmin, requireCsrf } from "../auth/routes.js";
import { audit, HttpError } from "../../utils/http.js";

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

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^[._-]+/, "")
    .slice(0, 120);
}

export async function mediaRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/",
    {
      preHandler: [requireAdmin, requireCsrf],
    },
    async (req, reply) => {
      const file = await req.file();
      if (!file) throw new HttpError(400, "NO_FILE", "Multipart file field is required");

      if (!ALLOWED_MIME.has(file.mimetype)) {
        throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", `File type ${file.mimetype} is not allowed`);
      }

      const ext = EXT_BY_MIME[file.mimetype] ?? "bin";
      const safeOriginal = sanitizeFilename(file.filename.replace(/\.[^.]*$/, ""));
      const storedName = `${Date.now()}-${randomBytes(8).toString("hex")}-${safeOriginal || "asset"}.${ext}`;
      const kindDir = path.join(config.uploadDir, "media");
      await mkdir(kindDir, { recursive: true });

      let sizeBytes = 0;
      await pipeline(file.file, createWriteStream(path.join(kindDir, storedName)));

      const stat = await import("node:fs/promises").then((fs) => fs.stat(path.join(kindDir, storedName)));
      sizeBytes = stat.size;

      if (sizeBytes > config.maxUploadMb * 1024 * 1024) {
        await unlink(path.join(kindDir, storedName)).catch(() => undefined);
        throw new HttpError(413, "PAYLOAD_TOO_LARGE", `File exceeds the ${config.maxUploadMb}MB limit`);
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
          title: (file.fields.title as { value?: string } | undefined)?.value ?? null,
        },
      });

      await audit(req, "media.upload", "media", asset.id, { filename: asset.filename, sizeBytes });
      reply.code(201);
      return { asset };
    },
  );

  app.get("/", { preHandler: [requireAdmin] }, async () => {
    const assets = await prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    return { assets };
  });

  app.delete("/:id", { preHandler: [requireAdmin, requireCsrf] }, async (req) => {
    const { id } = req.params as { id: string };
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new HttpError(404, "NOT_FOUND", "Asset not found");
    await unlink(path.join(config.uploadDir, "media", asset.storedName)).catch(() => undefined);
    await prisma.mediaAsset.delete({ where: { id } });
    await audit(req, "media.delete", "media", id, { filename: asset.filename });
    return { ok: true };
  });
}
