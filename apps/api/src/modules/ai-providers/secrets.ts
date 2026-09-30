import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { config } from "../../config.js";

/**
 * AES-256-GCM encryption for provider secrets at rest.
 * Key derived from AI_CONFIG_KEY (preferred) or SESSION_SECRET via SHA-256.
 * Stored format: base64(iv):base64(tag):base64(ciphertext)
 */
function encryptionKey(): Buffer {
  const raw = process.env.AI_CONFIG_KEY?.trim() || config.sessionSecret;
  return createHash("sha256").update(`ai-provider:${raw}`).digest();
}

export function encryptApiKey(plaintext: string): string {
  const key = encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptApiKey(stored: string | null | undefined): string | null {
  if (!stored) return null;
  try {
    const [ivB64, tagB64, dataB64] = stored.split(":");
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const key = encryptionKey();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const out = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
    return out.toString("utf8");
  } catch {
    return null;
  }
}

/** Masked suffix for admin display, e.g. "****ab12". Never the full key. */
export function keyHintFor(raw: string): string {
  const tail = raw.trim().slice(-4);
  return `****${tail}`;
}

export function keysEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  try {
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}
