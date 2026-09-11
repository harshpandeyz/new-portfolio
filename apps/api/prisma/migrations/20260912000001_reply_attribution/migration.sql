-- Reply attribution: which operator sent each inbox reply.
-- Applied to fresh databases via the base migration; this covers databases
-- that already applied 20260912000000 before sentBy existed.
ALTER TABLE "MessageReply" ADD COLUMN IF NOT EXISTS "sentBy" TEXT;
