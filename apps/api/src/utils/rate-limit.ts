import { createHmac } from "node:crypto";

import { config } from "../config.js";
import { prisma } from "../db/prisma.js";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

let lastSweepAt = 0;

function hashBucketKey(key: string): string {
  return createHmac("sha256", config.sessionSecret).update(`rate-limit:${key}`).digest("hex");
}

/**
 * Atomically increments a shared PostgreSQL fixed-window bucket. The original
 * identifier (which may contain an IP or email address) is never persisted.
 * This keeps protections consistent across API replicas without Redis.
 */
export async function rateLimit(key: string, max: number, windowMs: number): Promise<RateLimitResult> {
  if (!Number.isInteger(max) || max < 1 || max >= 2_147_483_647 || !Number.isFinite(windowMs) || windowMs < 1) {
    throw new Error("Invalid rate limit configuration");
  }

  const now = Date.now();
  if (now - lastSweepAt > 60_000) {
    lastSweepAt = now;
    // Cleanup is opportunistic; an outage here must not weaken the bucket
    // being checked below, so let the atomic query remain authoritative.
    void prisma.$executeRaw`DELETE FROM "RateLimitBucket" WHERE "resetAt" < NOW()`.catch((error: unknown) => {
      console.error("[rate-limit] bucket cleanup failed", error instanceof Error ? error.name : "unknown error");
    });
  }

  const keyHash = hashBucketKey(key);
  const rows = await prisma.$queryRaw<{ count: number; retryAfterSeconds: number }[]>`
    INSERT INTO "RateLimitBucket" ("keyHash", "count", "resetAt")
    VALUES (${keyHash}, 1, NOW() + (${windowMs} * INTERVAL '1 millisecond'))
    ON CONFLICT ("keyHash") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."resetAt" <= NOW() THEN 1
        ELSE LEAST("RateLimitBucket"."count" + 1, ${max + 1})
      END,
      "resetAt" = CASE
        WHEN "RateLimitBucket"."resetAt" <= NOW() THEN NOW() + (${windowMs} * INTERVAL '1 millisecond')
        ELSE "RateLimitBucket"."resetAt"
      END
    RETURNING "count", GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("resetAt" - NOW()))))::int AS "retryAfterSeconds"
  `;
  const bucket = rows[0];
  if (!bucket) throw new Error("Rate limiter did not return a bucket");
  return {
    allowed: bucket.count <= max,
    remaining: Math.max(0, max - bucket.count),
    retryAfterSeconds: bucket.count > max ? bucket.retryAfterSeconds : 0,
  };
}

/** Test hook — clears shared buckets between isolated API tests. */
export async function resetRateLimits(): Promise<void> {
  lastSweepAt = Date.now();
  await prisma.rateLimitBucket.deleteMany();
}
