import { prisma } from "../../db/prisma.js";

/** Shared circuit state prevents every API replica from retrying a failed LLM. */
export async function providerIsCoolingDown(provider: string): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<{ cooling: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM "ProviderCooldown"
        WHERE "provider" = ${provider} AND "cooldownUntil" > NOW()
      ) AS cooling
    `;
    return rows[0]?.cooling ?? true;
  } catch {
    // When shared breaker state cannot be read, skip paid provider calls and
    // let the deterministic knowledge answer handle the request.
    return true;
  }
}

export async function recordProviderFailure(provider: string): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "ProviderCooldown" ("provider", "failures", "cooldownUntil", "touchedAt")
    VALUES (${provider}, 1, NULL, NOW())
    ON CONFLICT ("provider") DO UPDATE SET
      "failures" = LEAST("ProviderCooldown"."failures" + 1, 6),
      "cooldownUntil" = CASE
        WHEN "ProviderCooldown"."failures" + 1 >= 2 THEN
          NOW() + LEAST(300, 30 * POWER(2, LEAST(GREATEST("ProviderCooldown"."failures" - 1, 0), 4))) * INTERVAL '1 second'
        ELSE "ProviderCooldown"."cooldownUntil"
      END,
      "touchedAt" = NOW()
  `;
}

export async function clearProviderFailure(provider: string): Promise<void> {
  await prisma.providerCooldown.deleteMany({ where: { provider } });
}
