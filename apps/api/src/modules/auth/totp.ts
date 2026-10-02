import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { authenticator } from "otplib";
import QRCode from "qrcode";

import { config } from "../../config.js";

authenticator.options = { window: 1 };

const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RECOVERY_CODE_LEN = 10;
const RECOVERY_COUNT = 10;

function totpKey(): Buffer {
  return createHash("sha256").update(`${config.sessionSecret}:totp-v1`).digest();
}

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function verifyTotp(token: string, secret: string): boolean {
  return verifyTotpCounter(token, secret) !== null;
}

/** Verify a code and return its 30-second TOTP counter for replay protection. */
export function verifyTotpCounter(token: string, secret: string): bigint | null {
  const code = token.replace(/[\s-]/g, "");
  if (!/^\d{6,8}$/.test(code)) return null;
  try {
    const delta = authenticator.checkDelta(code, secret);
    if (delta === null) return null;
    return BigInt(Math.floor(Date.now() / 30_000) + delta);
  } catch {
    return null;
  }
}

export function totpUri(secret: string, email: string, issuer = "HARSH // CONTROL"): string {
  return authenticator.keyuri(email, issuer, secret);
}

export async function totpQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, { margin: 1, width: 220 });
}

export function encryptSecret(plain: string): string {
  const key = totpKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(stored: string): string | null {
  try {
    const key = totpKey();
    const raw = Buffer.from(stored, "base64");
    if (raw.length < 12 + 16 + 8) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function generateRecoveryCodes(count = RECOVERY_COUNT): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i += 1) {
    let s = "";
    const bytes = randomBytes(RECOVERY_CODE_LEN);
    for (let j = 0; j < RECOVERY_CODE_LEN; j += 1) {
      s += RECOVERY_ALPHABET[bytes[j]! % RECOVERY_ALPHABET.length];
    }
    // grouped for readability: XXXXX-XXXXX
    codes.push(`${s.slice(0, 5)}-${s.slice(5)}`);
  }
  return codes;
}

function normalizeRecoveryCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s]/g, "");
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256")
    .update(`${config.sessionSecret}:recovery:${normalizeRecoveryCode(code)}`)
    .digest("hex");
}

export function verifyRecoveryCodeHash(code: string, hash: string): boolean {
  const candidate = hashRecoveryCode(code);
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
