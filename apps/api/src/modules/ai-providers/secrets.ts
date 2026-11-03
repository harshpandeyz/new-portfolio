import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { config } from "../../config.js";

/**
 * AES-256-GCM encryption for provider secrets at rest.
 * Writes use AI_CONFIG_KEY. Reads also accept the previous key and the old
 * SESSION_SECRET-derived key so a planned migration does not strand stored
 * provider credentials.
 * Stored format: base64(iv):base64(tag):base64(ciphertext)
 */
function encryptionKey(raw: string): Buffer {
  return createHash("sha256").update(`ai-provider:${raw}`).digest();
}

function decryptionKeys(): Buffer[] {
  const candidates = [config.aiConfigKey, config.aiConfigKeyPrevious, config.sessionSecret, config.sessionSecretPrevious];
  const seen = new Set<string>();
  return candidates
    .filter((raw) => raw && !seen.has(raw) && Boolean(seen.add(raw)))
    .map(encryptionKey);
}

export function encryptApiKey(plaintext: string): string {
  const key = encryptionKey(config.aiConfigKey);
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
    for (const key of decryptionKeys()) {
      try {
        const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
        decipher.setAuthTag(Buffer.from(tagB64, "base64"));
        const out = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
        return out.toString("utf8");
      } catch {
        // Try the next configured key; never log the ciphertext or key.
      }
    }
    return null;
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
