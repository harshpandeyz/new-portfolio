-- AI provider configuration (admin-managed, secrets encrypted at rest).
-- apiKeyEnc holds AES-256-GCM ciphertext (iv:tag:cipher b64); the raw key is
-- never returned by the API. keyHint stores a masked suffix for display only.
CREATE TABLE IF NOT EXISTS "AiProviderConfig" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'custom',
  "baseUrl" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "apiKeyEnc" TEXT,
  "keyHint" TEXT,
  "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
  "maxTokens" INTEGER NOT NULL DEFAULT 500,
  "timeoutMs" INTEGER NOT NULL DEFAULT 20000,
  "systemPrompt" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "isFallback" BOOLEAN NOT NULL DEFAULT false,
  "health" TEXT NOT NULL DEFAULT 'unknown',
  "lastLatencyMs" INTEGER,
  "lastError" TEXT,
  "lastCheckedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiProviderConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiProviderConfig_name_key" ON "AiProviderConfig"("name");
CREATE INDEX IF NOT EXISTS "AiProviderConfig_enabled_priority_idx" ON "AiProviderConfig"("enabled", "priority");
CREATE INDEX IF NOT EXISTS "AiProviderConfig_health_idx" ON "AiProviderConfig"("health");
