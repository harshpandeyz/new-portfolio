ALTER TABLE "User"
ADD COLUMN "totpLastCounter" BIGINT;

CREATE TABLE "LoginChallenge" (
    "nonceHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginChallenge_pkey" PRIMARY KEY ("nonceHash"),
    CONSTRAINT "LoginChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LoginChallenge_userId_expiresAt_idx" ON "LoginChallenge"("userId", "expiresAt");
CREATE INDEX "LoginChallenge_expiresAt_idx" ON "LoginChallenge"("expiresAt");

CREATE TABLE "RateLimitBucket" (
    "keyHash" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("keyHash")
);
CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");

CREATE TABLE "ProviderCooldown" (
    "provider" TEXT NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "cooldownUntil" TIMESTAMP(3),
    "touchedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProviderCooldown_pkey" PRIMARY KEY ("provider")
);

-- Retain only the historical aggregate signal when analytics is enabled;
-- discard prompt text and provider identifiers from the old chat log.
INSERT INTO "AnalyticsEvent" ("id", "type", "ref", "meta", "createdAt")
SELECT
    'legacy-chat-' || "id",
    'chat_query',
    CASE WHEN "confidence" IN ('VERIFIED', 'INFERRED', 'UNKNOWN') THEN "confidence" ELSE NULL END,
    NULL,
    "createdAt"
FROM "ChatQueryLog"
WHERE COALESCE(
    (SELECT "value" FROM "SiteSetting" WHERE "key" = 'feature.analytics'),
    'true'
) = 'true';

-- Raw prompt content is intentionally not retained.
DROP TABLE IF EXISTS "ChatQueryLog";
