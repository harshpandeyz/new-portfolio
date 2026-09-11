-- Least-privilege defaults + contact throttle index
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'VIEWER';
CREATE INDEX IF NOT EXISTS "ContactMessage_email_createdAt_idx" ON "ContactMessage"("email", "createdAt");
